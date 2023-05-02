/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

const functions = require('firebase-functions');
const { Storage } = require('@google-cloud/storage');
const path = require('path');
const os = require('os');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpeg_static = require('ffmpeg-static');

const gcs = new Storage();

// Makes an ffmpeg command return a promise.
function promisifyCommand(command) {
  return new Promise((resolve, reject) => {
    command.on('end', resolve).on('error', reject).run();
  });
}

/**
 * When an audio is uploaded in the Storage bucket We generate a mono channel audio automatically using
 * node-fluent-ffmpeg.
 */
// exports.generateMonoAudio = functions.storage.object().onFinalize(async (object) => {
exports.convertGifToMp4 = functions.storage.object().onFinalize(async (object) => {
  const fileBucket = object.bucket; // The Storage bucket that contains the file.
  const filePath = object.name; // File path in the bucket.
  const contentType = object.contentType; // File content type.

  // Exit if this is triggered on a file that is not a gif file.
  if (!contentType.startsWith('image/gif')) {
    functions.logger.log('This is not a gif file.');
    return null;
  }
  // Exit if this is triggered on a file that is not an audio.
  // if (!contentType.startsWith('audio/')) {
  //   functions.logger.log('This is not an audio.');
  //   return null;
  // }


  // Get the file name.
  const fileName = path.basename(filePath);
  // Exit if the gif file is already converted.
  if (fileName.endsWith('_output.mp4')) {
    functions.logger.log('Already a converted gif file.');
    return null;
  }
  // if (fileName.endsWith('_output.flac')) {
  //   functions.logger.log('Already a converted gif file.');
  //   return null;
  // }

  // Download file from bucket.
  const bucket = gcs.bucket(fileBucket);
  const tempFilePath = path.join(os.tmpdir(), fileName);
  // We add a '_output.flac' suffix to target audio file name. That's where we'll upload the converted audio.
  // const targetTempFileName = fileName.replace(/\.[^/.]+$/, '') + '_output.flac';
  const targetTempFileName = fileName.replace(/\.[^/.]+$/, '') + '_output.mp4';
  const targetTempFilePath = path.join(os.tmpdir(), targetTempFileName);
  const targetStorageFilePath = path.join(path.dirname(filePath), targetTempFileName);

  await bucket.file(filePath).download({destination: tempFilePath});
  functions.logger.log('Gif file downloaded locally to', tempFilePath);
  // Convert the audio to mono channel using FFMPEG.

  // let command = ffmpeg(tempFilePath)
  //     .setFfmpegPath(ffmpeg_static)
  //     .audioChannels(1)
  //     .audioFrequency(16000)
  //     .format('flac')                  // 変換後のファイルのformatを指定する
  //     .output(targetTempFilePath);     // 変換後のファイルを保存する場所を指定する

  // let command = ffmpeg(tempFilePath)
  //     .setFfmpegPath(ffmpeg_static)
  //     .inputFormat('gif')
  //     .audioChannels(1)
  //     .audioFrequency(16000)
  //     .format('mp4')
  //     .output(targetTempFilePath); 

  let command = ffmpeg(tempFilePath)
      .setFfmpegPath(ffmpeg_static)
      .inputFormat('gif')
      .videoCodec('libx264')
      .audioCodec('aac')
      .audioFrequency(44100)
      .audioChannels(2)
      .outputOptions('-pix_fmt yuv420p')
      .outputOptions('-movflags frag_keyframe+empty_moov')
      .outputOptions('-crf 23')
      .outputOptions('-b:v 800k')
      .outputOptions('-maxrate 800k')
      .outputOptions('-bufsize 1200k')
      // なんかこの2ついれるとmp4ファイルが生成されない
      // .fps(30) // フレームレートを設定
      // .outputOptions('-vf', 'loop=999999:1') // ループ再生を設定
      .format('mp4')
      .output(targetTempFilePath);

  await promisifyCommand(command);
  functions.logger.log('Output audio created at', targetTempFilePath);
  // Uploading the audio.
  await bucket.upload(targetTempFilePath, {destination: targetStorageFilePath});
  functions.logger.log('Output audio uploaded to', targetStorageFilePath);

  // Once the audio has been uploaded delete the local file to free up disk space.
  fs.unlinkSync(tempFilePath);
  fs.unlinkSync(targetTempFilePath);

  return functions.logger.log('Temporary files removed.', targetTempFilePath);
})
// const functions = require('firebase-functions');
// const admin = require('firebase-admin');
// admin.initializeApp();
// const spawn = require('child-process-promise').spawn; // For JS Promise
// const path = require('path');
// const os = require('os');
// const fs = require('fs');

// exports.generateThumbnail = functions.storage.object().onFinalize(async (object) => {
//   const fileBucket = object.bucket; // The Storage bucket that contains the file.
//   const filePath = object.name; // File path in the bucket.
//   const contentType = object.contentType; // File content type.
//   const metageneration = object.metageneration; // Number of times metadata has been generated. New objects have a value of 1.

//   // Exit if this is triggered on a file that is not an image.
//   if (!contentType.startsWith('image/')) {
//     return functions.logger.log('This is not an image.');
//   }

//   // Get the file name.
//   const fileName = path.basename(filePath);
//   // Exit if the image is already a thumbnail.
//   if (fileName.startsWith('thumb_')) {
//     return functions.logger.log('Already a Thumbnail.');
//   }

//   // Download file from bucket.
//   const bucket = admin.storage().bucket(fileBucket);
//   const tempFilePath = path.join(os.tmpdir(), fileName);
//   const metadata = {
//     contentType: contentType,
//   };
//   await bucket.file(filePath).download({destination: tempFilePath});
//   functions.logger.log('Image downloaded locally to', tempFilePath);
//   // Generate a thumbnail using ImageMagick.
//   await spawn('convert', [tempFilePath, '-thumbnail', '200x200>', tempFilePath]);
//   functions.logger.log('Thumbnail created at', tempFilePath);
//   // We add a 'thumb_' prefix to thumbnails file name. That's where we'll upload the thumbnail.
//   const thumbFileName = `thumb_${fileName}`;
//   const thumbFilePath = path.join(path.dirname(filePath), thumbFileName);
//   // Uploading the thumbnail.
//   await bucket.upload(tempFilePath, {
//     destination: thumbFilePath,
//     metadata: metadata,
//   });
//   // Once the thumbnail has been uploaded delete the local file to free up disk space.
//   return fs.unlinkSync(tempFilePath);
// });


// exports.convertGifToMp4 = functions.storage.


// // const functions = require('firebase-functions');
// // const admin = require('firebase-admin');
// // const ffmpeg = require('ffmpeg');
// // const cors = require('cors')({
// //   origin: true
// // });

// // admin.initializeApp();

// // exports.convertGifToMp4 = functions.https.onRequest(async (request, response) => {
// //   try {
// //     await cors(request, response);
// //     // アップロードされたオブジェクトがGIFファイルであるか確認
// //     if (!request.query.contentType.includes('image/gif')) {
// //       console.log('This is not a GIF file.');
// //       response.status(400).send({ error: 'This is not a GIF file.' });
// //       return;
// //     }

// //     const filePath = request.query.name;
// //     const bucket = admin.storage().bucket(request.query.bucket);

// //     // MP4ファイルのパスを生成
// //     const mp4FilePath = filePath.replace('.gif', '.mp4');
// //     const mp4File = bucket.file(mp4FilePath);

// //     // GIFファイルをダウンロード
// //     const gifBuffer = await bucket.file(filePath).download();
// //     const gifFilePath = `/tmp/${filePath}`;
// //     const gifFile = require('fs').createWriteStream(gifFilePath);
// //     gifFile.write(gifBuffer[0]);
// //     gifFile.end();

// //     // ffmpegを使用してMP4に変換
// //     const command = `ffmpeg -i ${gifFilePath} ${mp4FilePath}`;
// //     const ffmpegProcess = new ffmpeg(command);
// //     await ffmpegProcess;

// //     // MP4ファイルをFirebase Storageにアップロード
// //     const mp4Buffer = require('fs').readFileSync(mp4FilePath);
// //     await mp4File.save(mp4Buffer);

// //     // 一時ファイルを削除
// //     require('fs').unlinkSync(gifFilePath);
// //     require('fs').unlinkSync(mp4FilePath);

// //     console.log(`Converted ${filePath} to ${mp4FilePath}`);

// //     response.status(200).send({ success: true });
// //   } catch (error) {
// //     console.error(`Failed to convert ${filePath}: ${error}`);
// //     response.status(500).send({ error: `Failed to convert ${filePath}: ${error}` });
// //   }
// // });
