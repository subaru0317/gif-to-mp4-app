import { Button } from "@mui/material";
import React, { useState } from "react";
import ImageLogo from "./image.svg";
import "./ImageUpload.css";
import { storage, functions } from "./firebase"
import { getStorage, ref, uploadBytesResumable } from "firebase/storage";


const ImageUploader = () => {
  const [loading, setLoading] = useState(false);
  const [isUploaded, setUploaded] = useState(false);
  
  const convertGifToMp4 = functions.httpsCallable("convertGifToMp4");
  const OnFileUploadToFirebase = async (e) => {
    const file = e.target.files[0];
    const storageRef = ref(storage, "images/" + file.name);
    const uploadImage = uploadBytesResumable(storageRef, file);

    uploadImage.on("state_changed", (snapshot) => {
      setLoading(true);
    },
    (error) => {
      console.log(error);
    },
    async () => {
      setLoading(false);
      setUploaded(true);
      // const result = await convertGifToMp4({ filePath: storageRef.fullPath });
      const result = await convertGifToMp4(storageRef.fullPath);
    }
    );
  };
  return (
    <>
      {loading ? (
        <h2>Upload now...</h2>
      ) : (
        <>
          {isUploaded ? (
            <h2>Finish!</h2>
          ) : (
            <div className="outerBox">
            <div className="title">
              <h2>Converter - Gif to Mp4</h2>
              <p>GIF File</p>
            </div>
            <div className="imageUplodeBox">
              <div className="imageLogoAndText">
                <img src={ImageLogo} alt="imagelogo" />
                <p>Drag and drop</p>
              </div>
              <input
                className="imageUploadInput"
                multiple
                name="imageURL"
                type="file"
                accept=".gif"
                onChange={OnFileUploadToFirebase}
              />
            </div>
            <p>or</p>
            <Button variant="contained">
              Please select files
              <input
                className="imageUploadInput"
                type="file"
                accept=".gif"
                onChange={OnFileUploadToFirebase}
              />
            </Button>
          </div>
          )}
        </>
      )}
    </>

  );
};

export default ImageUploader;
