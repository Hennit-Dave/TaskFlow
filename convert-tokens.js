/**
 * Design Tokens to CSS Variables Converter
 * 
 * This script reads a design tokens JSON file (e.g., from Figma Tokens)
 * and converts it into a CSS file with custom properties (CSS variables).
 * 
 * Features:
 * - Flattens nested objects into kebab-case variable names
 * - Resolves and formats aliases (e.g. {colors.primary} -> var(--colors-primary))
 * - Formats complex token types like Figma dropShadow effects
 * - Appends standard units (px) to dimension tokens
 * - Documents sections automatically (e.g., distinguishing Primitive Colors vs Color Roles)
 * 
 * Usage:
 * node convert-tokens.js <input-path> <output-path>
 */

const fs = require('fs');
const path = require('path');

/**
 * Converts any string into kebab-case.
 * Spaces, dots, underscores, and camelCase are handled.
 */
function toKebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Convert camelCase
    .replace(/[\s._]+/g, '-')            // Replace spaces, dots, and underscores with hyphen
    .toLowerCase();
}

/**
 * Processes token values based on their type.
 * Also parses alias references to point to other CSS variables.
 */
function processValue(value, type) {
  // Replace Figma token aliases e.g., {primitive colors.primary} -> var(--primitive-colors-primary)
  if (typeof value === 'string') {
    const aliasRegex = /\{([^}]+)\}/g;
    if (aliasRegex.test(value)) {
      return value.replace(aliasRegex, (match, aliasPath) => `var(--${toKebabCase(aliasPath)})`);
    }
  }

  // Handle dimensional variables by appending 'px'
  if (type === 'dimension') {
    return value === 0 ? '0' : `${value}px`;
  }

  // Handle figma custom shadow tokens (they come in as objects)
  if (type === 'custom-shadow') {
    if (typeof value === 'object') {
      const offsetX = value.offsetX === 0 ? '0' : `${value.offsetX}px`;
      const offsetY = value.offsetY === 0 ? '0' : `${value.offsetY}px`;
      const radius = value.radius === 0 ? '0' : `${value.radius}px`;
      const spread = value.spread === 0 ? '0' : `${value.spread}px`;
      const color = value.color;
      const inset = value.shadowType === 'innerShadow' ? 'inset ' : '';
      return `${inset}${offsetX} ${offsetY} ${radius} ${spread} ${color}`;
    }
  }

  return value;
}

/**
 * Recursively iterates through the JSON structure to find token objects.
 * Flattening the object's path produces the CSS variable name.
 */
function flattenTokens(obj, prefix = [], variablesGroup = []) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const currentVal = obj[key];
      const currentPrefix = [...prefix, key];

      // A token is defined by having both 'value' and 'type' keys
      if (currentVal !== null && typeof currentVal === 'object' && 'value' in currentVal && 'type' in currentVal) {
        const varName = `--${toKebabCase(currentPrefix.join('-'))}`;
        const varValue = processValue(currentVal.value, currentVal.type);
        variablesGroup.push(`  ${varName}: ${varValue};`);
      } 
      // If it's an object but not a token, keep traversing
      else if (currentVal !== null && typeof currentVal === 'object') {
        flattenTokens(currentVal, currentPrefix, variablesGroup);
      }
    }
  }
  return variablesGroup;
}

/**
 * Main execution function
 */
function convertTokensToCSS(inputFile, outputFile) {
  try {
    const rawData = fs.readFileSync(inputFile, 'utf-8');
    const tokensData = JSON.parse(rawData);

    let cssOutput = `/* \n * Design System Variables \n * Auto-generated from design tokens\n */\n\n:root {\n`;

    // Process top-level keys to group our CSS variables logically
    for (const sectionKey in tokensData) {
      if (tokensData.hasOwnProperty(sectionKey)) {
        const sectionTokens = tokensData[sectionKey];
        const sectionVariables = flattenTokens(sectionTokens, [sectionKey]);
        
        if (sectionVariables.length > 0) {
          // Document section headers
          cssOutput += `\n  /* --- ${sectionKey.toUpperCase()} --- */\n`;
          
          // Provide specific guidance based on token architecture
          if (sectionKey.toLowerCase().includes('primitive')) {
            cssOutput += `  /* NOTE: Primitive colors are the foundation of the color system.\n     They should NOT be applied directly to UI components.\n     Use the Color Roles defined below instead. */\n`;
          }
          if (sectionKey.toLowerCase().includes('color roles')) {
            cssOutput += `  /* NOTE: Color Roles are semantic variables mapped to primitives.\n     These are designed to be applied directly to UI components. */\n`;
          }

          cssOutput += sectionVariables.join('\n') + '\n';
        }
      }
    }

    cssOutput += `}\n`;

    fs.writeFileSync(outputFile, cssOutput);
    console.log(`✅ Successfully converted design tokens from ${inputFile} to ${outputFile}`);

  } catch (error) {
    console.error('❌ Error converting tokens:', error.message);
  }
}

// Extract args from CLI
const inputFilePath = process.argv[2] || path.join(__dirname, 'design-tokens.tokens.json');
const outputFilePath = process.argv[3] || path.join(__dirname, 'design-system.css');

if (!fs.existsSync(inputFilePath)) {
  console.error(`❌ Input file not found: ${inputFilePath}`);
  process.exit(1);
}

convertTokensToCSS(inputFilePath, outputFilePath);
