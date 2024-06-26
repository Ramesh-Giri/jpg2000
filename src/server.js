const express = require('express');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json({ limit: '50mb' }));

app.post('/convertAndSaveImage', async (req, res) => {
  const tmpdir = os.tmpdir();
  let jp2FilePath = '';
  let outputFilePath = '';

  try {
    // Parse the raw data from the request body
    const byteArray = req.body.byteArray;
    if (!Array.isArray(byteArray)) {
      res.status(400).send('Invalid byteArray');
      return;
    }

    // Construct the JP2 file from the raw data
    jp2FilePath = path.join(tmpdir, 'input.jp2');
    fs.writeFileSync(jp2FilePath, Buffer.from(byteArray));

    // Path for the output PNG file
    outputFilePath = path.join(tmpdir, 'output.png');

    // Convert JP2 to PNG using openjpeg
    await new Promise((resolve, reject) => {
      exec(`./opj_decompress -i ${jp2FilePath} -o ${outputFilePath}`, (error, stdout, stderr) => {
        if (error) {
          console.error(`exec error: ${error}`);
          console.error(`stderr: ${stderr}`);
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
    if (jp2FilePath && fs.existsSync(jp2FilePath)) {
      fs.unlinkSync(jp2FilePath);
    }
    if (outputFilePath && fs.existsSync(outputFilePath)) {
      fs.unlinkSync(outputFilePath);
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
