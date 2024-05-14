const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const fs = require("fs");
const cors = require("cors");
const path = require("path");
const fileUpload = require("express-fileupload");
const candidateModel = require("./models/candidate");

dotenv.config();
const app = express();
app.use(cors());
app.use(fileUpload());

const createDir = (directoryName) => {
  if (!fs.existsSync(directoryName)) {
    fs.mkdir(directoryName, (err) => {
      if (err) {
        console.error("Error creating directory:", err);
      } else {
        console.log("Directory created successfully");
      }
    });
  }
};
createDir("public/resume");
createDir("public/photo");

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname + "/public"));

app.get("/", (req, res) => {
  res.render("index.ejs", getIndexData());
});

app.post("/", async (req, res) => {
  const { name, roll, degree, department, college, skills } = req.body;
  const photo = req.files.photo;
  const resumeFile = req.files.resume;
  const uniqueSuffix = Date.now() + Math.round(Math.random() * 1e9);
  const resumeUploadPath = path.join("/resume", uniqueSuffix + resumeFile.name);
  const photoUploadPath = path.join("/photo", uniqueSuffix + photo.name);

  const result = await candidateModel.find({
    roll: roll,
    college: college,
    dept: department,
  });

  if (result.length > 0) {
    return res.render("index", getIndexData(null, "User already exists"));
  }
  resumeFile.mv(
    path.join(__dirname, "public", resumeUploadPath),
    async function (err) {
      console.log("resume path is " + resumeUploadPath);
      if (err)
        return res
          .status(500)
          .render("index", getIndexData(null, "Error uploading resume"));

      photo.mv(path.join(__dirname, "public", photoUploadPath), async (err) => {
        if (err)
          return res
            .status(500)
            .render("index", getIndexData(null, "Error uploading photo"));

        const resumePath = resumeUploadPath;
        const photoPath = photoUploadPath;
        try {
          await candidateModel.create({
            name: name,
            roll: roll,
            degree: degree,
            dept: department,
            college: college,
            skills: skills,
            photo: photoPath,
            resume: resumePath,
          });

          return res.render(
            "index",
            getIndexData("Resume uploaded successfully!")
          );
        } catch (error) {
          console.error(error);
          return res
            .status(400)
            .render(
              "index",
              getIndexData(
                null,
                "Internal Server Error... Please try again later..."
              )
            );
        }
      });
    }
  );
});

app.get("/candidate", (req, res) => {
  res.render("candidate.ejs", getIndexData());
});

app.post("/candidate", async (req, res) => {
  const { skills } = req.body;
  console.log("skill is " + skills);
  try {
    const result = await candidateModel.find({
      skills: { $regex: new RegExp(skills, "i") },
    });
    const extractedData = result.map((candidate) => ({
      name: candidate.name,
      roll: candidate.roll,
      department: candidate.dept,
      degree: candidate.degree,
      skills: candidate.skills,
      photo: candidate.photo,
      resume: candidate.resume,
    }));

    console.log(extractedData);
    return res.status(200).render("candidate", getIndexData(extractedData));
  } catch (err) {
    return res.status(400).render("candidate", getIndexData(null, err));
  }
});

app.get("/student/:rollno", async (req, res) => {
  try {
    const result = await candidateModel.findOne({
      roll: req.params.rollno,
    });

    if (!result) {
      return res
        .status(404)
        .render("profile", getIndexData(null, "Candidate not found"));
    }

    console.log(result);
    res.render("profile", getIndexData(result));
  } catch (error) {
    console.error("Error fetching candidate profile:", error);
    res
      .status(500)
      .render("profile", getIndexData(null, "Internal Server Error"));
  }
});

app.get("/resume/:filename", (req, res) => {
  const file = req.query?.fileName;
  res.status(200).sendFile(path.join(__dirname, "public/resume", file));
});

function getIndexData(data, error) {
  return {
    data: data,
    error: error,
  };
}

mongoose
  .connect(process.env.MONGO_DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    app.listen(3000, function () {
      console.log("Server started on port 3000");
    });
    console.log("Connected to MongoAtlas");
  })
  .catch((err) => {
    console.log("Error connecting to MongoAtlas... Are you connected to HP??");
    console.log(err);
  });
