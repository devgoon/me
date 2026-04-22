#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { evaluateFitResponse } = require('../tests/evals/fit-rubric');
const { evaluateChatResponse } = require('../tests/evals/chat-rubric');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function toSummaryLine(result) {
  const status = result.passed ? 'PASS' : 'FAIL';
  const details = result.failures.length ? ` | ${result.failures.join('; ')}` : '';
  return `${status} ${result.id} -> ${result.score}/${result.maxScore} (min ${result.minScore})${details}`;
}

function main() {
  const projectRoot = path.resolve(__dirname, '..');
  const fitCasesPath = path.join(projectRoot, 'tests', 'evals', 'fixtures', 'fit-eval-cases.json');
  const chatCasesPath = path.join(
    projectRoot,
    'tests',
    'evals',
    'fixtures',
    'chat-eval-cases.json'
  );

  const fitTestCases = readJson(fitCasesPath);
  const chatTestCases = readJson(chatCasesPath);

  // Optional override lets you evaluate real model outputs.
  // Expected shape: { "case-id": { score, verdict, reasons, mismatches, suggestedMessage }, ... }
  const outputsPath = process.env.EVAL_MODEL_OUTPUTS_PATH;
  let outputsByCaseId = null;
  if (outputsPath) {
    outputsByCaseId = readJson(path.resolve(outputsPath));
  }

  const chatOutputsPath = process.env.EVAL_CHAT_OUTPUTS_PATH;
  let chatOutputsByCaseId = null;
  if (chatOutputsPath) {
    chatOutputsByCaseId = readJson(path.resolve(chatOutputsPath));
  }

  const fitResults = fitTestCases.map((testCase) => {
    const response =
      outputsByCaseId && outputsByCaseId[testCase.id]
        ? outputsByCaseId[testCase.id]
        : testCase.modelResponse;

    return evaluateFitResponse(testCase, response);
  });

  const chatResults = chatTestCases.map((testCase) => {
    const response =
      chatOutputsByCaseId && chatOutputsByCaseId[testCase.id]
        ? chatOutputsByCaseId[testCase.id]
        : testCase.modelResponse;

    return evaluateChatResponse(testCase, response);
  });

  console.log('Fit eval summary');
  console.log('================');
  for (const result of fitResults) {
    console.log(toSummaryLine(result));
  }

  console.log('');
  console.log('Chat eval summary');
  console.log('=================');
  for (const result of chatResults) {
    console.log(toSummaryLine(result));
  }

  const allResults = [...fitResults, ...chatResults];
  const passed = allResults.filter((r) => r.passed).length;
  const failed = allResults.length - passed;
  console.log('----------------');
  console.log(`Total: ${allResults.length} | Passed: ${passed} | Failed: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
