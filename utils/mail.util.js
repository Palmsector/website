import ejs from "ejs";
import path from "path";
import { fileURLToPath } from "url";
import { sendEmail } from "./sendEmail.js";

// Get the current file path and directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class Email {
  constructor(user, amount, code) {
    this.to = user.email;
    this.name = user.fullName;
    this.amount = amount;
    this.code = code;
  }

  async _send(template, subject) {
    const getCurrentYear = () => new Date().getFullYear();

    const html = await ejs.renderFile(
      `${__dirname}/../views/emails/${template}.ejs`,
      {
        name: this.name,
        amount: this.amount,
        code: this.code,
        year: getCurrentYear(),
      }
    );

    // Send email
    await sendEmail({
      to: this.to,
      subject,
      html,
    });

    console.log(`📧 Email sent to ${this.to} with subject "${subject}"`);
  }

  async sendWelcome() {
    await this._send("welcome", "Welcome to Palm Sector");
  }
  async sendVerification() {
    await this._send("verification", "Verify your Email");
  }
  async sendDeposit() {
    await this._send("deposit", "New Deposit");
  }
  async sendDepositFinal() {
    await this._send("depositFinal", "Deposit Confirmed");
  }
  async sendInvestment() {
    await this._send("investment", "New Investment");
  }
  async sendWithdrawal() {
    await this._send("withdrawal", "New Withdrawal");
  }
  async sendWithdrawalFinal() {
    await this._send("withdrawFinal", "Withdrawal Confirmed");
  }
  async sendForgotPassword() {
    await this._send("forgotPassword", "Forgot Password");
  }
  async sendBonus() {
    await this._send("bonus", "New Bonus");
  }
  async sendCommission() {
    await this._send("commission", "New Referral Commission");
  }
  async sendReferralEmail() {
    await this._send("referralEmail", "New Referral");
  }
  async sendSuspended() {
    await this._send("suspended", "Account Suspended");
  }
  async sendUnsuspend() {
    await this._send("unSuspend", "Account Reinstatement");
  }
  async sendDepositRejected() {
    await this._send("depositRejected", "Deposit Rejected");
  }
  async sendWithdrawalRejected() {
    await this._send("withdrawalRejected", "Withdrawal Rejected");
  }
  async sendPayout() {
    await this._send("payout", "New Earning");
  }
}
