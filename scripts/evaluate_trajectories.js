import { evaluate } from "langsmith/evaluation";
import { Client } from "langsmith";
import * as dotenv from "dotenv";

// Load environment variables from .env.local
dotenv.config({ path: ".env.local" });

const client = new Client({
  apiKey: process.env.LANGCHAIN_API_KEY,
});

const DATASET_NAME = "trajectory_analysis_cursor_rm";

/**
 * Evaluate the trajectory of a run by comparing it to a reference trajectory.
 * The evaluation is agnostic to which trajectory is longer. The match ratio is
 * calculated as the number of matched steps divided by the maximum length of the two trajectories.
 */
function evaluateTrajectory(run, example) {
  // Extract trajectories from the correct locations
  const refTrajectory = example.outputs?.trajectory || [];
  const runTrajectory = run.outputs?.trajectory || [];

  // Initialize pointers and matched steps counter
  let i = 0;
  let j = 0;
  let matchedSteps = 0;

  // Find subsequence matches
  while (i < refTrajectory.length && j < runTrajectory.length) {
    if (refTrajectory[i] === runTrajectory[j]) {
      matchedSteps++;
      i++;
    }
    j++;
  }

  // Calculate max length and match ratio
  const maxLength = Math.max(refTrajectory.length, runTrajectory.length);
  const matchRatio = maxLength === 0 ? 1.0 : matchedSteps / maxLength;

  return {
    key: "trajectory_match",
    score: matchRatio,
    comment: `Matched ${matchedSteps} steps out of max length ${maxLength}. Reference trajectory: [${refTrajectory.join(", ")}], Run trajectory: [${runTrajectory.join(", ")}]`
  };
}

function predictTrajectory(input) {
  const question = input.question.toLowerCase();
  
  // First check for information queries (no action needed)
  if (question.includes('when did') ||
      question.includes('what is') ||
      question.includes('latest update') ||
      question.includes('become a customer') ||
      question.includes('show me') ||
      question.includes('tell me about')) {
    return [];
  }

  // Check for delete operations (check before update since they're more specific)
  if (question.includes('delete') || 
      question.includes('remove') ||
      question.includes('close permanently') ||
      question.includes('get rid of') ||
      question.includes('cancel ticket')) {
    return ['delete_ticket'];
  }
  
  // Check for create operations - must be explicit about creation and no existing ticket references
  if ((question.includes('create') && !question.includes('class="entity-ticket"')) || 
      (question.includes('new ticket') && !question.includes('class="entity-ticket"')) || 
      (question.includes('make') && question.includes('ticket') && !question.includes('class="entity-ticket"')) ||
      (question.includes('open') && question.includes('ticket') && !question.includes('class="entity-ticket"'))) {
    // Additional checks to ensure we're not updating an existing ticket
    if (!question.includes('ticket data:') && 
        !question.includes('ticket:') && 
        !question.includes('@ticket-') &&
        !question.includes('id:') &&
        !question.includes('status') &&
        !question.includes('priority') &&
        !question.includes('assigned to') &&
        !question.includes('so that')) {
      return ['create_ticket'];
    }
  }
  
  // Most complex case: updates - check after create since we want to be sure it's not a creation
  if (question.includes('change') || 
      question.includes('update') || 
      question.includes('set') || 
      question.includes('assign') ||
      question.includes('modify') ||
      question.includes('edit') ||
      question.includes('mark as') ||
      question.includes('move to') ||
      // HTML ticket references usually indicate updates
      question.includes('class="entity-ticket"') ||
      // JSON ticket data usually indicates updates
      question.includes('ticket data:') ||
      question.includes('ticket:') ||
      // Ticket ID references usually indicate updates
      question.includes('@ticket-') ||
      question.includes('ticket') && question.includes('id:') ||
      // Implicit updates via property changes
      (question.includes('ticket') && 
       (question.includes('subject') || 
        question.includes('status') || 
        question.includes('priority') ||
        question.includes('assigned to')))) {
    return ['update_ticket'];
  }
  
  // Default to empty trajectory if no clear action is detected
  return [];
}

async function runEvaluation() {
  try {
    console.log(`\nStarting evaluation on dataset: ${DATASET_NAME}`);

    // Run the evaluation
    const results = await evaluate(
      // This is our agent function that we're evaluating
      async (input) => {
        return {
          trajectory: predictTrajectory(input),
          response: "Predicted response based on the question."
        };
      },
      {
        data: DATASET_NAME,
        evaluators: [evaluateTrajectory],
        experimentName: "loyal-charge-68",
        options: {
          includeRunInfo: true
        }
      }
    );

    console.log("\nEvaluation Results:");
    console.log("===================");
    
    if (!results || typeof results !== 'object') {
      console.log("No results returned from evaluation");
      return;
    }

    // Process results based on actual structure
    const processedResults = results.results.map(result => {
      const run = result.run;
      const example = result.example;
      const evaluation = result.evaluationResults?.results?.[0];

      return {
        runId: run.id,
        input: run.inputs,
        expectedTrajectory: example.outputs?.trajectory || [],
        actualTrajectory: run.outputs?.trajectory || [],
        score: evaluation?.score || 0,
        comment: evaluation?.comment || 'No comment available'
      };
    });

    // Calculate statistics
    const totalExamples = processedResults.length;
    const averageScore = processedResults.reduce((sum, r) => sum + r.score, 0) / totalExamples;

    console.log(`\nTotal Examples Evaluated: ${totalExamples}`);
    console.log(`Average Score: ${averageScore.toFixed(3)}`);
    
    // Print detailed results
    console.log("\nDetailed Results:");
    processedResults.forEach((result, index) => {
      console.log(`\nExample ${index + 1}:`);
      console.log(`Run ID: ${result.runId}`);
      console.log(`Score: ${result.score.toFixed(3)}`);
      console.log(`Expected Trajectory: [${result.expectedTrajectory.join(", ")}]`);
      console.log(`Actual Trajectory: [${result.actualTrajectory.join(", ")}]`);
      console.log(`Details: ${result.comment}`);
    });

  } catch (error) {
    console.error("Error running evaluation:", error);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
  }
}

runEvaluation(); 