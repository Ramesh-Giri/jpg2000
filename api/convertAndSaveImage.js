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
  const opjDecompressPath = path.join(__dirname, '../openjpeg/bin/opj_decompress');

  try {
    const byteArray = req.body.byteArray;

    if (!byteArray || !Array.isArray(byteArray)) {
      console.error('Invalid byteArray');
      return res.status(400).send('Invalid byteArray.');
    }

    console.log('Byte array received');

    // Write byte array to temporary JP2 file
    fs.writeFileSync(jp2FilePath, Buffer.from(byteArray));

    // Convert JP2 to PNG
    await new Promise((resolve, reject) => {
      exec(`${opjDecompressPath} -i ${jp2FilePath} -o ${outputFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          return reject(error);
        }
        resolve();
      });
    });

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
    }
    if (fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
  }
});

module.exports = app;
