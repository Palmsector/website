import cron from "node-cron";

// Services
import { CronJobService } from "../services/cronService.services.js";
import userServices from "../services/user.services.js";
import referralServices from "../services/referral.services.js";
import depositServices from "../services/deposit.services.js";
import investmentServices from "../services/investment.services.js";
import withdrawalServices from "../services/withdrawal.services.js";
import earningServices from "../services/earning.services.js";
import bonusServices from "../services/bonus.services.js";
import penaltyServices from "../services/penalty.services.js";
import userProfileServices from "../services/userProfile.services.js";
import userWalletServices from "../services/wallet.services.js";
import referralWithdrawalServices from "../services/referralWithdrawal.services.js";

//Utils and Enums
import { Email } from "../utils/mail.util.js";
import { sendEmail } from "../utils/adminMail.util.js";
import {
  calculateUserBalance,
  calculateReferralBalance,
} from "../utils/calculateBalance.js";
import { getCryptoAddress } from "../utils/getWallet.util.js";
import { formatDateWithTime } from "../utils/format.utils.js";
import { plans } from "../enums/index.js";

class UserController {
  //Cron Job Initialization
  constructor() {
    const cronJobService = new CronJobService();

    // Schedule the cron job to run every 10 minutes
    cron.schedule("*/10 * * * *", async () => {
      await cronJobService.runDailyInvestmentUpdates();
    });
  }

  //Health Check Route
  async healthCheck(req, res) {
    console.log("Health check was done successfully.");
    return res
      .status(200)
      .json({ message: "Health Check was completed successfully." });
  }

  //Render User Dashboard
  async renderDashboard(req, res) {
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserWithDetails(userId);
    const referrals = await referralServices.fetchReferrals(userId);
    const allTransactions = [
      ...userDetails.Deposits,
      ...userDetails.Withdrawals,
      ...userDetails.Investments,
      ...userDetails.Penalties,
      ...userDetails.Earnings,
    ];

    const userBalance = calculateUserBalance(userDetails);

    // Sort by `createdAt` in descending order
    const sortedTransactions = allTransactions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    // Get the last three transactions
    const lastThreeTransactions = sortedTransactions.slice(0, 3);

    return res.render(userDetails.isSuspended ? "suspend" : "dashboard", {
      user: userDetails,
      referrals,
      currentPage: req.url,
      lastThreeTransactions,
      userBalance,
      formatDateWithTime,
    });
  }

  //Render user deposit
  async renderDepositPage(req, res) {
    const userDetails = res.locals.userDetails;
    const userBalance = calculateUserBalance(userDetails);
    return res.render(userDetails.isSuspended ? "suspend" : "deposit", {
      user: userDetails,
      currentPage: req.url,
      deposits: userDetails.Deposits,
      userBalance,
      minimum: parseFloat(process.env.MINIMUM_DEPOSIT),
      formatDateWithTime,
    });
  }

  // Process Deposits
  async handleDeposit(req, res) {
    try {
      const { amount, coin } = req.body;

      // Check if all required fields are filled
      if (!amount || !coin) {
        req.flash("message", {
          error: true,
          title: "Incomplete Field",
          description: "Kindly fill the required fields.",
        });
        return res.redirect("/user/deposit");
      }

      if (parseFloat(amount) < parseFloat(process.env.MINIMUM_DEPOSIT)) {
        req.flash("message", {
          info: true,
          title: "Minimum Not Met",
          description: `Sorry, the minimum amount to deposit is $100 kindly add $${
            parseFloat(process.env.MINIMUM_DEPOSIT) - parseFloat(amount)
          } to the previous amount.`,
        });
        return res.redirect("/user/deposit");
      }
      const userId = res.locals.user.id;
      const userDetails = await userServices.fetchUserById(userId);
      res.render("checkout", {
        amount,
        coin,
        wallet: getCryptoAddress(coin),
        currentPage: "/deposit",
        user: userDetails,
      });
    } catch (error) {
      req.flash("message", {
        error: true,
        title: "Error",
        description:
          "Sorry, we couldn't process your deposit request now, kindly try again later.",
      });
    }
  }

  //Process Checkout
  async handleCheckout(req, res) {
    try {
      if (req.body.action === "cancel") {
        return res.redirect("/user/deposit");
      }

      const userId = res.locals.user.id;
      const userDetails = await userServices.fetchUserById(userId);

      const { amount, transactionHash, coin } = req.body;

      // Check if all required fields are filled
      if (!amount || !coin || !transactionHash) {
        req.flash("message", {
          error: true,
          title: "Incomplete Field",
          description: "Kindly fill the required fields.",
        });
        return res.redirect("/user/deposit");
      }

      const data = {
        amount: parseFloat(amount),
        transactionHash,
        coin,
        userId,
      };

      await depositServices.newDeposit(data);

      // Client Notification
      new Email(userDetails, data.amount).sendDeposit();

      //Admin Notification
      const subject = "New Deposit Notification";
      const text = `The client ${userDetails.fullName} and email ${userDetails.email} just deposited $${data.amount} in your website, kindly log in to confirm.`;

      sendEmail(subject, text);

      req.flash("message", {
        success: true,
        title: "Deposit Successful",
        description: `Your deposit of ${data.amount} was successful and currently pending. You can view the status in your history or deposit page.`,
      });
      res.redirect("/user/deposit");
    } catch (error) {
      req.flash("message", {
        error: true,
        title: "Deposit Failed",
        description: `We were unable to process your deposit at this time. Please try again later.`,
      });
      res.redirect("/user/deposit");
    }
  }

  // Render Plans Page
  async renderPlansPage(req, res) {
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserById(userId);
    return res.render(userDetails.isSuspended ? "suspend" : "plans", {
      user: userDetails,
      currentPage: req.url,
    });
  }

  // Render Investment Page
  async renderInvestmentPage(req, res) {
    const userBalance = res.locals.userBalance;
    const userDetails = res.locals.userDetails;
    const investments = userDetails.Investments.filter(
      (investment) => investment.status === "running"
    );

    return res.render(userDetails.isSuspended ? "suspend" : "investment", {
      user: userDetails,
      currentPage: req.url,
      investments,
      totalInvestments: userDetails.Investments.length,
      userBalance,
    });
  }

  // Handle Investment
  async handleInvestment(req, res) {
    const userDetails = res.locals.userDetails;

    const { investmentPlan, amount } = req.body;

    try {
      // Ensure the selected plan exists
      if (!plans[investmentPlan]) {
        req.flash("message", {
          error: true,
          title: "Investment Failed",
          description: `Invalid investment plan selected.`,
        });
        return res.redirect("/user/invest");
      }

      // Validate amount against the selected plan
      const { min, max } = plans[investmentPlan];
      if (amount < min || amount > max) {
        req.flash("message", {
          error: true,
          title: "Investment Failed",
          description: `The amount must be between $${min.toLocaleString()} and $${max.toLocaleString()} for the ${
            investmentPlan.charAt(0).toUpperCase() + investmentPlan.slice(1)
          } Plan.`,
        });
        return res.redirect("/user/invest");
      }

      //Make sure the user has such amount
      const userBalance = res.locals.userBalance;
      if (amount > userBalance) {
        req.flash("message", {
          error: true,
          title: "Investment Failed",
          description: `You need to deposit $${(
            parseFloat(amount) - parseFloat(userBalance)
          ).toLocaleString()} 
          in order to invest in the entered amount in ${
            investmentPlan.charAt(0).toUpperCase() + investmentPlan.slice(1)
          } Plan.`,
        });
        return res.redirect("/user/deposit");
      }

      //Add the End date
      const currentDate = new Date();
      const endDate = new Date(
        currentDate.getTime() +
          plans[investmentPlan].duration * 24 * 60 * 60 * 1000
      );

      const data = {
        plan: investmentPlan,
        amount: parseFloat(amount),
        dailyPercent: plans[investmentPlan].dailyPercent,
        endDate,
        payoutAmount: parseFloat(amount),
        userId: userDetails.id,
      };

      await investmentServices.newInvestment(data);

      //Client Notification
      new Email(userDetails, data.amount, data.plan).sendInvestment();

      //Admin Notification
      const subject = "New Investment Notification";
      const text = `The client of name: ${userDetails.fullName} and email: ${userDetails.email} just started the ${data.plan}  plan with the amount $${data.amount} in your website.`;

      sendEmail(subject, text);

      req.flash("message", {
        success: true,
        title: "Investment Successful",
        description: `Your investment has been successfully placed. You can view your investment details in your portfolio`,
      });
      res.redirect("/user/invest");
    } catch (error) {
      console.log("Investment error", error);
      req.flash("message", {
        error: true,
        title: "Investment Failed",
        description: `We were unable to process your investment at this time. Please review the details and try again.`,
      });
      res.redirect("/user/invest");
    }
  }

  // Render User Withdrawal
  async renderWithdrawal(req, res) {
    const userBalance = res.locals.userBalance;
    const userDetails = res.locals.userDetails;
    const referralBalance = calculateReferralBalance(userDetails);
    console.log("The referral balance", referralBalance);
    return res.render(userDetails.isSuspended ? "suspend" : "withdraw", {
      user: userDetails,
      currentPage: req.url,
      withdrawals: userDetails.Withdrawals,
      userBalance,
      minimum: parseFloat(process.env.MINIMUM_WITHDRAWAL),
      formatDateWithTime,
    });
  }

  //Process Withdrawal
  async handleWithdrawal(req, res) {
    const userBalance = res.locals.userBalance;
    const userDetails = res.locals.userDetails;
    const referralBalance = calculateReferralBalance(userDetails);
    const userId = res.locals.user.id;

    const { amount, coin, withdrawalType } = req.body;

    if (!amount || !coin || coin.length === 0 || !withdrawalType) {
      req.flash("message", {
        info: true,
        title: "Incomplete Fields",
        description: `There are incomplete fields in your withdrawal request. Please try again.`,
      });
      return res.redirect("/user/withdraw");
    }

    try {
      //Check if there is no selected withdrawal type
      if (!withdrawalType) {
        req.flash("message", {
          info: true,
          title: "No Withdrawal Type",
          description: `Please select a withdrawal type to proceed.`,
        });
        return res.redirect("/user/withdraw");
      }

      //Check Minimum Withdrawal
      if (parseFloat(amount) < parseFloat(process.env.MINIMUM_WITHDRAWAL)) {
        req.flash("message", {
          info: true,
          title: "Minimum Not Met",
          description: `Sorry, the minimum amount to withdraw is $100 kindly add $${
            parseFloat(process.env.MINIMUM_WITHDRAWAL) - req.body.amount
          } to the previous amount.`,
        });
        return res.redirect("/user/withdraw");
      }

      //Check entered amount is more than the referral balance
      if (
        withdrawalType === "referral" &&
        parseFloat(amount) > parseFloat(referralBalance)
      ) {
        req.flash("message", {
          info: true,
          title: "Insufficient Funds",
          description: `Requested amount exceeds your available balance. Please enter a lower amount.`,
        });
        return res.redirect("/user/withdraw");
      }

      //Check if the user entered an amount more than the balance
      if (
        withdrawalType === "standard" &&
        parseFloat(amount) > parseFloat(userBalance)
      ) {
        req.flash("message", {
          error: true,
          title: "Insufficient Funds",
          description: `We were unable to process your withdrawal request at this time. Please review the requested amount and try again later.`,
        });
        return res.redirect("/user/withdraw");
      }

      //Check if the user has a wallet address
      const userWallet = await userWalletServices.fetchUserWallets(userId);

      if (!userWallet || userWallet.coin === null) {
        req.flash("message", {
          error: true,
          title: "No Wallet Address",
          description: `We were unable to process your withdrawal request at this time. Please update your ${
            coin === "trc20" ? "USDT TRC20" : coin
          } wallet address.`,
        });
        return res.redirect("/user/profile");
      }

      const data = {
        amount: parseFloat(amount),
        coin,
        walletAddress: userWallet.coin,
        userId,
      };

      //Check Withdrawal Type and send a response
      if (withdrawalType === "standard") {
        await withdrawalServices.newWithdrawal(data);
      }

      if (withdrawalType === "referral") {
        await referralWithdrawalServices.newReferralWithdrawal(data);
      }

      //Client Notification
      new Email(userDetails, data.amount).sendWithdrawal();

      //Admin Notification
      const subject = "New Withdrawal Notification";
      const text = `The client of name: ${userDetails.name} and email ${userDetails.email} just withdrew amount: $${data.amount} from his account now, kindly log in to confirm the withdrawal.`;

      sendEmail(subject, text);

      req.flash("message", {
        success: true,
        title: "Withdrawal Successful",
        description: `Your withdrawal request has been submitted successfully. Please, processing time takes between an hour to 24 Hours.`,
      });
      res.redirect("/user/withdraw");
    } catch (error) {
      req.flash("message", {
        error: true,
        title: "Withdrawal Failed",
        description: `We were unable to process your withdrawal request at this time. Please review the details and try again later.`,
      });
      console.log("Withdrawal  Error", error);
      res.redirect("/user/withdraw");
    }
  }

  // Render History
  async renderHistory(req, res) {
    const userBalance = res.locals.userBalance;
    const userDetails = res.locals.userDetails;
    console.log("User Details", userDetails);
    const allTransactions = [
      ...userDetails.Deposits,
      ...userDetails.Withdrawals,
      ...userDetails.Investments,
      ...userDetails.Penalties,
      ...userDetails.Earnings,
      ...userDetails.Bonuses,
      ...userDetails.ReferralWithdrawals,
    ];

    // Sort by `createdAt` in descending order
    const sortedTransactions = allTransactions.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );

    return res.render(userDetails.isSuspended ? "suspend" : "history", {
      user: userDetails,
      currentPage: req.url,
      withdrawals: userDetails.Withdrawals,
      userBalance,
      transactions: sortedTransactions,
      formatDateWithTime,
    });
  }

  //Render Individual Histories
  async renderIndividualHistory(req, res) {
    const { id, type } = req.query;
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserById(userId);
    if (!id || !type) {
      req.flash("message", {
        error: true,
        title: "Error",
        description: `Sorry, we couldn't fetch more details about the transaction, please try again later.`,
      });
      return res.redirect("/user/history");
    }

    // Fetch the transaction based on its type and ID
    let transaction;
    switch (type.toLowerCase()) {
      case "deposit":
        transaction = await depositServices.fetchDeposit(id);
        break;
      case "withdrawal":
        transaction = await withdrawalServices.fetchWithdrawal(id);
        break;
      case "investment":
        transaction = await investmentServices.fetchInvestment(id);
        break;
      case "penalty":
        transaction = await penaltyServices.fetchPenalty(id);
        break;
      case "earning":
        transaction = await earningServices.fetchEarning(id);
        break;
      case "bonus":
        transaction = await bonusServices.fetchBonus(id);
        break;
      case "referralWithdrawal":
        transaction = await referralWithdrawalServices.fetchReferralWithdrawal(
          id
        );
        break;
      default:
        req.flash("error", "Invalid transaction type.");
        return res.redirect("/user/history");
    }

    if (!transaction) {
      req.flash("error", "Transaction not found.");
      return res.redirect("/user/history");
    }

    // Render transaction details
    res.render(userDetails.isSuspended ? "suspend" : "transaction", {
      transaction,
      type,
      user: userDetails,
      currentPage: req.url,
    });
  }

  // Render Referral
  async renderReferral(req, res) {
    const userId = res.locals.user.id;
    const user = res.locals.userDetails;
    const referralBalance = calculateReferralBalance(user);
    const userDetails = await userServices.fetchUserById(userId);
    const referrals = await referralServices.fetchReferrals(userId);
    const withdrawals =
      await referralWithdrawalServices.fetchReferralWithdrawals(userId);

    res.render(userDetails.isSuspended ? "suspend" : "referral", {
      referrals,
      referralBalance,
      withdrawals,
      user: userDetails,
      currentPage: req.url,
      formatDateWithTime,
    });
  }

  // Render Profile
  async renderProfile(req, res) {
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserById(userId);
    let userProfile, userWallets;

    userProfile = await userProfileServices.fetchUserProfile(userId);
    userWallets = await userWalletServices.fetchUserWallets(userId);

    //Check if the user has a profile and wallets, if not create a new one
    if (!userProfile) await userProfileServices.newUserProfile({ userId });

    if (!userWallets) await userWalletServices.newUserWallet({ userId });

    res.render(userDetails.isSuspended ? "suspend" : "profile", {
      user: userDetails,
      currentPage: req.url,
      userProfile,
      userWallets,
    });
  }

  // Handle Profile Edit
  async handleProfileEdit(req, res) {
    const userId = res.locals.user.id;

    const { country, city, postalCode, gender, coin, walletAddress } = req.body;

    //Get previous data
    const userProfile = await userProfileServices.fetchUserProfile(userId);
    const userWallets = await userWalletServices.fetchUserWallets(userId);

    const profileData = {
      country: country || userProfile.country,
      city: city || userProfile.city,
      postalCode: postalCode || userProfile.postalCode,
      gender: gender || userProfile.gender,
    };

    const walletData = {
      bitcoin: coin === "bitcoin" ? walletAddress : userWallets.bitcoin,
      tron: coin === "tron" ? walletAddress : userWallets.tron,
      ethereum: coin === "ethereum" ? walletAddress : userWallets.ethereum,
      trc20: coin === "trc20" ? walletAddress : userWallets.trc20,
    };

    try {
      // Update the user's profile ams wallet
      await userProfileServices.editUserProfile(userId, profileData);

      if (coin && walletAddress)
        await userWalletServices.editUserWallet(userId, walletData);

      req.flash("message", {
        success: true,
        title: "Profile Updated",
        description: `Your profile ${
          coin && walletAddress ? "and wallets" : ""
        } was updated successfully.`,
      });
      res.redirect("/user/profile");
    } catch (error) {
      req.flash("message", {
        error: true,
        title: "Profile Not Updated",
        description: `Sorry, we couldn't update your profile, kindly try again later.`,
      });
      res.redirect("/user/profile");
    }
  }

  // Render Support Page
  async renderSupportPage(req, res) {
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserById(userId);

    res.render(userDetails.isSuspended ? "suspend" : "support", {
      user: userDetails,
      currentPage: req.url,
    });
  }

  //Handle Support
  async handleSupport(req, res) {
    const userId = res.locals.user.id;
    const userDetails = await userServices.fetchUserById(userId);

    const { heading, body } = req.body;

    try {
      //Admin Notification
      const subject = "New Support Request";
      const text = `The client of name: ${userDetails.name} and email ${userDetails.email} just requested for support. The title of his complaint ${heading} and the complaint or enquiry is ${body}.`;

      sendEmail(subject, text);

      req.flash("message", {
        success: true,
        title: "Support Ticket Received",
        description: `We're glad we could assist you. Your support ticket has been received.`,
      });
      res.redirect("/user/support");
    } catch (error) {
      req.flash("message", {
        error: true,
        title: "Error",
        description: `Unable to process support request. Please try again later.`,
      });
      res.redirect("/user/support");
    }
  }
}

export default new UserController();
