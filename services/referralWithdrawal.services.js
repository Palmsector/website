import { prisma } from "../utils/prisma.utils.js";

class ReferralWithdrawalService {
    
  // Create a new referral withdrawal
  async newReferralWithdrawal(data) {
    try {
      return await prisma.referralWithdrawal.create({
        data,
      });
    } catch (error) {
      console.error("Error creating referral withdrawal:", error);
      throw new Error("Could not create referral withdrawal.");
    }
  }

  // Fetch referral withdrawal for a specific user
  async fetchReferralWithdrawals(userId) {
    try {
      return await prisma.referralWithdrawal.findMany({
        where: {
          userId,
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      console.error("Error fetching user referral withdrawals:", error);
      throw new Error("Could not fetch referral withdrawals.");
    }
  }

  // Fetch a referral withdrawal
  async fetchReferralWithdrawal(id) {
    try {
      return await prisma.referralWithdrawal.findUnique({
        where: {
          id,
        },
      });
    } catch (error) {
      console.error("Error fetching a referral withdrawal:", error);
      throw new Error("Could not fetch referral withdrawal.");
    }
  }

  // Fetch all referral withdrawals
  async fetchAllReferralWithdrawals() {
    try {
      return await prisma.referralWithdrawal.findMany({
        
        include: {
          User: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      });
    } catch (error) {
      console.error("Error fetching all referral withdrawals:", error);
      throw new Error("Could not fetch all referral withdrawals.");
    }
  }

  // Edit a referral withdrawal status
  async editReferralWithdrawal(id, status) {
    try {
      return await prisma.referralWithdrawal.update({
        where: {
          id,
        },
        data: {
          status,
        },
      });
    } catch (error) {
      console.error("Error updating a referral withdrawal status:", error);
      throw new Error("Could not update a referral withdrawal status.");
    }
  }

  // Delete a referral withdrawal
  async deleteReferralWithdrawal(id) {
    try {
      return await prisma.referralWithdrawal.delete({
        where: {
          id,
        },
      });
    } catch (error) {
      console.error("Error deleting a referral withdrawal:", error);
      throw new Error("Could not delete referral withdrawal.");
    }
  }
}

export default new ReferralWithdrawalService();