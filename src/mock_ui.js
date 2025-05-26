#!/usr/bin/env node

// src/mock_ui.js - Mock UI for testing without Electron
const fs = require('fs');
const path = require('path');

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  
  for (let i = 0; i < args.length; i += 2) {
    if (args[i].startsWith('--')) {
      params[args[i].replace('--', '')] = args[i + 1];
    }
  }
  
  return params;
}

function mockFeedbackUI() {
  const { prompt = 'Enter your feedback', 'predefined-options': predefinedOptionsStr = '', 'output-file': outputFile } = parseArgs();
  
  console.log('='.repeat(60));
  console.log('MOCK FEEDBACK UI');
  console.log('='.repeat(60));
  console.log(`Prompt: ${prompt}`);
  
  const predefinedOptions = predefinedOptionsStr ? predefinedOptionsStr.split('|||') : [];
  
  if (predefinedOptions.length > 0) {
    console.log('\nPredefined Options:');
    predefinedOptions.forEach((option, index) => {
      console.log(`  ${index + 1}. ${option}`);
    });
  }
  
  console.log('\nFor testing purposes, this mock UI will automatically respond with:');
  
  // Create a mock response
  let mockResponse = '';
  
  if (predefinedOptions.length > 0) {
    // Select first option for testing
    mockResponse = predefinedOptions[0];
    console.log(`Selected option: ${mockResponse}`);
  }
  
  // Add some mock text feedback
  const mockTextFeedback = 'This is a mock response from the test UI. The functionality is working correctly!';
  
  if (mockResponse) {
    mockResponse += '\n\n' + mockTextFeedback;
  } else {
    mockResponse = mockTextFeedback;
  }
  
  console.log(`Text feedback: ${mockTextFeedback}`);
  
  const result = {
    interactive_feedback: mockResponse
  };
  
  if (outputFile) {
    try {
      fs.writeFileSync(outputFile, JSON.stringify(result));
      console.log(`\nResult saved to: ${outputFile}`);
      console.log(`Result: ${JSON.stringify(result, null, 2)}`);
    } catch (error) {
      console.error(`Error saving result: ${error.message}`);
      process.exit(1);
    }
  } else {
    console.log(`\nResult: ${JSON.stringify(result, null, 2)}`);
  }
  
  console.log('='.repeat(60));
  console.log('Mock UI completed successfully');
  console.log('='.repeat(60));
}

if (require.main === module) {
  mockFeedbackUI();
}

module.exports = mockFeedbackUI;
