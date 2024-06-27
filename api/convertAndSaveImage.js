const express = require('express');
const bodyParser = require('body-parser');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();

// Middleware to parse JSON bodies
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/api/convertAndSaveImage', async (req, res) => {
  const tmpdir = os.tmpdir();
  const jp2FilePath = path.join(tmpdir, 'input.jp2');
  const outputFilePath = path.join(tmpdir, 'output.png');
  const opjDecompressPath = path.join(__dirname, '../bin/opj_decompress');

  console.log('opj_decompress path:', opjDecompressPath);

  try {
    const byteArray = req.body.byteArray;

    if (!byteArray || !Array.isArray(byteArray)) {
      console.error('Invalid byteArray:', byteArray);
      return res.status(400).send('Invalid byteArray.');
    }

    console.log('Byte array received:', byteArray.length, 'bytes');

    // Write byte array to temporary JP2 file
    fs.writeFileSync(jp2FilePath, Buffer.from(byteArray));
    console.log('JP2 file written to:', jp2FilePath);

    // Ensure opj_decompress has execution permissions
    fs.chmodSync(opjDecompressPath, '755');
    console.log('opj_decompress binary permissions set.');

    // Convert JP2 to PNG
    await new Promise((resolve, reject) => {
      exec(`${opjDecompressPath} -i ${jp2FilePath} -o ${outputFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error('exec error:', error);
          console.error('stdout:', stdout);
          console.error('stderr:', stderr);
          return reject(error);
        }
        console.log('Conversion stdout:', stdout);
        console.log('Conversion stderr:', stderr);
        resolve();
      });
    });

    console.log('Conversion completed. Reading output file:', outputFilePath);
    // Read the PNG file
    const pngData = fs.readFileSync(outputFilePath);
    res.setHeader('Content-Type', 'image/png');
    res.status(200).send(pngData);
  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Internal Server Error');
  } finally {
    // Clean up temporary files
    if (fs.existsSync(jp2FilePath)) {
      fs.unlinkSync(jp2FilePath);
      console.log('Temporary JP2 file deleted:', jp2FilePath);
    }
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
      console.log('Temporary output file deleted:', outputFilePath);
    }
  }
});

module.exports = app;
