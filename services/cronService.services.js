//Import utils and enums
import { prisma } from "../utils/prisma.utils.js";
import { plans } from "../enums/index.js"

export class CronJobService {
  async runDailyInvestmentUpdates() {
    console.log("Running daily investment updates...");

    const now = new Date();
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    // Fetch investments due for updates
    const dueInvestments = await prisma.investment.findMany({
      where: {
        status: "running",
        lastIncrementDate: { lt: startOfToday }, // Ensures only one update per day
      },
    });

    console.log(`Found ${dueInvestments.length} investments due for updates.`);

    for (const investment of dueInvestments) {
      const dailyIncrement =
        investment.amount * (investment.dailyPercent / 100);
      let updatedPayout = investment.payoutAmount + dailyIncrement;

      // Get number of days elapsed since startDate
      const startDate = new Date(investment.startDate);
      const endDate = new Date(investment.endDate);
      const daysElapsed =
        Math.floor((now - startDate) / (1000 * 60 * 60 * 24)) + 1;

      // Last day check: Ensure total payoutAmount is exactly the correct formula
      const isLastDay = daysElapsed >= plans[investment.plan].duration || now >= endDate;

      if (isLastDay) {
        updatedPayout = investment.amount + (investment.amount * (investment.dailyPercent / 100) * plans[investment.plan].duration);
      }

      // Update the database
      await prisma.investment.update({
        where: { id: investment.id },
        data: {
          payoutAmount: updatedPayout, // Either daily increase or final adjustment
          lastIncrementDate: now,
          ...(isLastDay && { status: "completed" }), // Mark as completed if last day
        },
      });

      console.log(
        `Investment ${
          investment.id
        } updated. Payout Amount: ${updatedPayout}. ${
          isLastDay ? "Marked as completed." : ""
        }`
      );
    }

    console.log("Daily investment updates completed.");
  }
}
