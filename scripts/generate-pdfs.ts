
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import getTemplateData from '../src/lib/templates';
import { FormValues } from '../src/types';

const resumeDataDir = path.join(__dirname, '../resume-data');
const distDir = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../public');

const main = () => {
  // Create dist directory if it doesn't exist
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir);
  }

  // Read all files from resume-data directory
  const files = fs.readdirSync(resumeDataDir);

  // Filter for .json files
  const jsonFiles = files.filter((file) => path.extname(file) === '.json');

  if (jsonFiles.length === 0) {
    console.log('No JSON files found in resume-data directory.');
    return;
  }

  // Generate PDF for each JSON file
  for (const jsonFile of jsonFiles) {
    try {
      generatePdf(jsonFile);
    } catch (error) {
      console.error(`Failed to generate PDF for ${jsonFile}:`, error);
    }
  }
};

const generatePdf = (jsonFile: string) => {
  console.log(`Generating PDF for ${jsonFile}...`);

  const jsonFilePath = path.join(resumeDataDir, jsonFile);
  const resumeData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf-8')) as FormValues;

  const { texDoc, opts } = getTemplateData(resumeData);
  const tempDir = fs.mkdtempSync(path.join(__dirname, 'resume-'));

  try {
    // Write main .tex file
    fs.writeFileSync(path.join(tempDir, 'resume.tex'), texDoc);

    // Copy template assets
    if (opts.inputs) {
      for (const input of opts.inputs) {
        const sourcePath = path.join(publicDir, input);
        const destPath = path.join(tempDir, path.basename(input));
        fs.copyFileSync(sourcePath, destPath);
      }
    }

    // Create fonts directory and copy fonts
    if (opts.fonts) {
        const fontsDir = path.join(tempDir, 'fonts');
        if (!fs.existsSync(fontsDir)) {
            fs.mkdirSync(fontsDir);
        }
        for (const font of opts.fonts) {
            const sourcePath = path.join(publicDir, font);
            const destPath = path.join(fontsDir, path.basename(font));
            fs.copyFileSync(sourcePath, destPath);
        }
    }

    // Run LaTeX command
    const command = `${opts.cmd} -interaction=nonstopmode resume.tex`;
    execSync(command, { cwd: tempDir, stdio: 'inherit' });
    execSync(command, { cwd: tempDir, stdio: 'inherit' }); // Run twice for references

    // Copy PDF to dist directory
    const pdfName = `${path.basename(jsonFile, '.json')}.pdf`;
    const sourcePdfPath = path.join(tempDir, 'resume.pdf');
    const destPdfPath = path.join(distDir, pdfName);
    fs.copyFileSync(sourcePdfPath, destPdfPath);

    console.log(`Successfully generated ${pdfName}`);
  } finally {
    // Clean up temporary directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
};

main();
