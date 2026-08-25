/**
 * Smoke checks for Wedding AI topic scope classifier.
 * Run: npx --yes esbuild scripts/test-wedding-ai-scope.ts --bundle --platform=node --format=cjs --outfile=.tmp-test-scope.cjs --alias:@=./ && node .tmp-test-scope.cjs && rm .tmp-test-scope.cjs
 */
import {
  classifyWeddingAiMessage,
  weddingAiScopedReply,
} from "../lib/wedding-ai-scope"

function assert(label: string, condition: boolean) {
  if (!condition) {
    console.error(`FAIL ${label}`)
    process.exitCode = 1
  } else {
    console.log(`PASS ${label}`)
  }
}

const cases: Array<[string, "celebration" | "basic" | "off_topic"]> = [
  ["hello", "basic"],
  ["thanks!", "basic"],
  ["what can you help with?", "basic"],
  ["give me a leg day workout", "off_topic"],
  ["write python code to sort a list", "off_topic"],
  ["what colours work for a Pakistani mehndi?", "celebration"],
  ["how should guests dress for the walima?", "celebration"],
  ["tell me about bitcoin investing", "off_topic"],
  ["Salam", "basic"],
]

for (const [message, expected] of cases) {
  const result = classifyWeddingAiMessage(message)
  assert(`"${message}" → ${expected}`, result.scope === expected)
}

const offReply = weddingAiScopedReply("off_topic", {
  offTopicHint: "workouts",
  userMessage: "leg day",
})
assert("off-topic reply mentions celebrations", /celebration|shaadi|Mehndi/i.test(offReply))

const basicReply = weddingAiScopedReply("basic", { userMessage: "hi" })
assert("basic reply is welcoming", /Salam|assistant/i.test(basicReply))

if (process.exitCode) {
  console.error("\nScope checks failed")
  process.exit(1)
}
console.log("\nAll Wedding AI scope checks passed")
