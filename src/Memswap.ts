import { ponder } from "@/generated";

ponder.on("Memswap:IntentCancelled", async ({ event, context }) => {
  console.log(event.params);
});

ponder.on("Memswap:IntentPosted", async ({ event, context }) => {
  console.log(event.params);
});
