import { prisma } from "../utils/prisma.utils.js";

class UserWalletServices {

  // Create a new user wallet
  async newUserWallet(data) {

    try {
      return await prisma.userWallet.create({
        data,
      });
    } catch (error) {
      console.error("Error creating user wallet:", error);
      throw new Error("Could not create user wallet.");
    }
  }

  //Edit a user wallet
  async editUserWallet(userId, data) {
    try {
      return await prisma.userWallet.update({
        where: {
          userId,
        },
        data
      });
    } catch (error) {
      console.error("Error editing user wallet:", error);
      throw new Error("Could not edit user wallet.");
    }
  }

  // Fetch the user wallet for a specific user
  async fetchUserWallets(userId) {
    try {
      return await prisma.userWallet.findUnique({
        where: {
          userId,
        },
      });
    } catch (error) {
      console.error("Error fetching user wallet:", error);
      throw new Error("Could not fetch wallet.");
    }
  }
}


export default new UserWalletServices()