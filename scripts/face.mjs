// The command face shared by the operation scripts; loaded only when a script runs as a command.
export async function runCommand(operationDefinition, operation) {
  const { runJavascriptNodeOperation } = await import("@red-cup-engineering/javascript-node-services-section/operation");
  process.exitCode = (await runJavascriptNodeOperation(
    { ...operationDefinition, operation },
    { arguments: process.argv.slice(2), standardInput: process.stdin, standardOutput: process.stdout },
  )).exitCode;
}
