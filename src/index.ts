import * as dotenv from "dotenv";
dotenv.config();
import express from "express";
import connectDB from "./config/db";
import { check, validationResult } from "express-validator";
import bcrypt from "bcrypt";
import User from "./models/userModel";
import cors from "cors";
import bodyParser from "body-parser";
import jwt from "jsonwebtoken";
import Offer from "./models/offerModel";
import mongoose from "mongoose";

// Importing the fs and https modules -------------- STEP 1
// console.log("test!");
// const https = require("https");
// const fs = require("fs");

// Read the certificate and the private key for the https server options
// ------------------- STEP 2
// const options = {
//   key: fs.readFileSync("./config/cert.key"),
//   cert: fs.readFileSync("./config/cert.crt"),
// };

const app = express();
const port = 5000;

connectDB();

const corsOptions ={
  origin:'*', 
  credentials:true,            //access-control-allow-credentials:true
  optionSuccessStatus:200,
}

app.use(cors(corsOptions));

app.get("/", (_, res) => {
  res.status(200).send();
});

app.use(bodyParser.json()).use(bodyParser.urlencoded({ extended: true }));

// Handle register
app.post(
  "/api/register",
  [
    check("password")
      .trim()
      .notEmpty()
      .withMessage("Prosze podać hasło")
      .isLength({ min: 8 })
      .withMessage("Hasło musi mieć min 8 znaków")
      .matches(/(?=.*?[A-Z])/)
      .withMessage("Hasło musi mieć przynajmniej jeden duzy znak")
      .matches(/(?=.*?[a-z])/)
      .withMessage("Hasło musi mieć przynajmniej jeden mały znak")
      .matches(/(?=.*?[0-9])/)
      .withMessage("Hasło musi mieć przynajmniej jeden numer")
      .not()
      .matches(/^$|\s+/)
      .withMessage("Znaki biały są niedozwolone"),
    check("mail")
      .isEmail()
      .trim()
      .normalizeEmail()
      .withMessage("Zły mail"),
    check("name").trim().escape(),
  ],
  async (req: express.Request, res: express.Response) => {
    console.log(req.body.mail)

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.json({ ok: false, errors: errors.array() });
    }

    try {
      const newPassword = await bcrypt.hash(req.body.password, 10);

      await User.create({
        name: req.body.name,
        email: req.body.mail,
        password: newPassword,
        theme: "light",
        points: 100,
        profileImage: "bear.png",
      });

      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.json({ ok: false, errors: [{ msg: "Posiadasz już konto!" }] });
    }
  }
);

// Handle login
app.post(
  "/api/login",
  [
    check("password").trim().escape(),
    check("mail").isEmail().trim().escape().normalizeEmail(),
  ],
  async (req: express.Request, res: express.Response) => {
    console.log(req.body);

    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Taki użytkownik nie istnieje" });
    }

    const isPasswordValid = await bcrypt.compare(
      req.body.password,
      user.password
    );

    if (isPasswordValid && process.env.JWT_SECRET) {
      const token = jwt.sign(
        {
          name: user.name,
          email: user.email,
        },
        process.env.JWT_SECRET
      );

      return res.json({
        ok: true,
        user: {
          token: token,
          name: user.name,
          mail: user.email,
          subjects: user.subjects,
          profileImage: user.profileImage,
          theme: user.theme,
          points: user.points,
        },
      });
    } else {
      return res.json({
        ok: false,
        user: false,
        error: "Mail lub hasło się nie zgadzają",
      });
    }
  }
);

app.post(
  "/api/getData",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Taki użytkownik nie istnieje" });
    }

    const token = jwt.sign(
      {
        name: user.name,
        email: user.email,
      },
      process.env.JWT_SECRET
    );

   let friends: any = [];
if (user.friends && user.friends.length) {
  await Promise.all(
    user.friends.map(async (el) => {
      try {
        let friendUser = await User.findById(el.id);
        if (friendUser) {
          friends.push({ name: friendUser.name, avatar: friendUser.profileImage, id: friendUser._id });
        }
      } catch (err) {
        console.error(err);
      }
    })
  );
}

    return res.json({
      ok: true,
      user: {
        id: user._id,
        token: token,
        name: user.name,
        mail: user.email,
        subjects: user.subjects,
        profileImage: user.profileImage,
        theme: user.theme,
        points: user.points,
        friends: friends
      },
    });
  }
);

// Handle post offer
app.post(
  "/api/postoffer",
  [
    check("title").trim().escape(),
    check("subject").trim().escape(),
    check("info").trim().escape(),
    check("price").trim().escape(),
    check("mail").trim().escape(),
  ],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ ok: false, errors: errors.array() });
    }

    try {
      await Offer.create({
        title: req.body.title,
        subject: req.body.subject,
        info: req.body.info,
        price: req.body.price,
        email: req.body.email,
        dates: req.body.dates,
      });

      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.json({
        ok: false,
        errors: [{ msg: "Utworzenie oferty się nie udało!" }],
      });
    }
  }
);

// Handle get theme from database
app.post(
  "/api/getTheme",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Błąd pobierania motywu" });
    }

    return res.json({
      ok: true,
      theme: user.theme,
    });
  }
);

// Handle updating theme in the database
app.put(
  "/api/updatetheme",
  [check("theme")],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ ok: false, errors: errors.array() });
    }

    try {
      const filter = { email: req.body.email };
      const update = { theme: req.body.theme };

      await User.findOneAndUpdate(filter, update);

      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.json({
        ok: false,
        errors: [{ msg: "Zmiana motywu się nie powiodła!" }],
      });
    }
  }
);

app.post(
  "/api/editProfile",
  [
    check("mail").isEmail().trim().escape().normalizeEmail(),
    check("username").trim().escape(),
    check("profileImage").trim().escape(),
  ],
  async (req: express.Request, res: express.Response) => {
    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Nie znaleziono." });
    }

    console.log(req.body.profileImage);

    try {
      await User.updateOne(
        { email: user.email },
        {
          name: req.body.username,
          subjects: req.body.subjects,
          profileImage: req.body.profileImage,
        }
      );
    } catch (err) {
      return res.json({ ok: false, error: "Wystąpił błąd" });
    }

    return res.json({
      ok: true,
    });
  }
);

// Handle get subjects from database
app.post(
  "/api/getSubjects",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Błąd pobierania przedmiotów" });
    }

    return res.json({
      ok: true,
      subjects: user.subjects,
    });
  }
);

// Handle get featured offers for user from database
app.post(
  "/api/getChosenOffers",
  [check("subject"), check("mail")],
  async (req: express.Request, res: express.Response) => {
    Offer.aggregate([
      {
        $lookup: {
          from: "user",
          localField: "email",
          foreignField: "email",
          as: "authorName",
        },
      },
    ])
      .then(async (data) => {
        let offers: any[] = [];

        data.forEach((el) => {
          if (
            el.subject.toLowerCase() == req.body.subject.toLowerCase() &&
            el.email !== req.body.mail
          ) {
            offers.push(el);
          }
        });

        return res.json({
          ok: true,
          offers: offers,
        });
      })
      .catch((error) => {
        console.log(error);
      });
  }
);

// Handle get points from database
app.post(
  "/api/getPoints",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const user = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Błąd pobierania punktów" });
    }

    return res.json({
      ok: true,
      points: user.points,
    });
  }
);

app.put(
  "/api/updatePoints",
  [check("email").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ ok: false, errors: errors.array() });
    }

    try {
      const filter = { email: req.body.email };
      const update = { points: req.body.points };

      await User.findOneAndUpdate(filter, update);

      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.json({
        ok: false,
        errors: [{ msg: "Aktualizacja punktów się nie powiodła" }],
      });
    }
  }
);

app.post(
  "/api/getUserOffers",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    console.log(req.body.mail);

    const offers = await Offer.find({
      email: req.body.mail,
    });

    const promises = offers.map(async (offer, i) => {
      const newAcceptedBy: any = await Promise.all(
        offer.acceptedBy.map(async (el, j) => {
          let teacher = await User.findOne({
            email: el.teacher,
          });

          const newEl = {
            ...el,
            teacherName: teacher.name,
            teacherAvatar: teacher.profileImage,
          };
          console.log(newEl);

          return newEl;
        })
      );

      return {
        ...offer.toObject(),
        acceptedBy: newAcceptedBy,
      };
    });

    const newOffers = await Promise.all(promises);

    if (!newOffers) {
      return res.json({ ok: false, error: "Błąd pobierania ofert" });
    }

    return res.json({
      ok: true,
      data: newOffers,
    });
  }
);

app.post(
  "/api/sendOfferRequest",
  [
    check("mail").isEmail().trim().escape().normalizeEmail(),
    check("date").trim().escape(),
    check("id").trim().escape(),
  ],
  async (req: express.Request, res: express.Response) => {
    const offers = await Offer.updateOne(
      { _id: req.body.id },
      {
        $addToSet: {
          acceptedBy: {
            teacher: req.body.mail,
            date: req.body.date,
            points: req.body.points,
          },
        },
      }
    );

    if (!offers) {
      return res.json({ ok: false, error: "Błąd pobierania ofert" });
    }

    return res.json({
      ok: true,
      data: offers,
    });
  }
);

app.post(
  "/api/planLesson",
  [
    check("teacherMail").isEmail().trim().escape().normalizeEmail(),
    check("date").trim().escape(),
    check("studentMail").trim().escape(),
    check("offerId").trim().escape(),
    check("lessonUrl").trim().escape(),
  ],
  async (req: express.Request, res: express.Response) => {
    const offer = await Offer.findOne({_id: req.body.offerId})

    const student = await User.updateOne(
      {
        email: req.body.studentMail,
      },
      {
        $addToSet: {
          plannedLessons: {
            date: req.body.date,
            teacherMail: req.body.teacherMail,
            studentMail: req.body.studentMail,
            lessonUrl: req.body.lessonUrl,
            points: req.body.points,
            completed: false,
            title: offer.title
          },
        },
      }
    );

    const teacher = await User.updateOne(
      {
        email: req.body.teacherMail,
      },
      {
        $addToSet: {
          plannedLessons: {
            date: req.body.date,
            teacherMail: req.body.teacherMail,
            studentMail: req.body.studentMail,
            lessonUrl: req.body.lessonUrl,
            points: req.body.points,
            completed: false,
            title: offer.title
          },
        },
      }
    );

    const offers = await Offer.deleteOne({
      _id: req.body.offerId,
    });

    console.log(offers);

    if (!teacher || !student || !offers) {
      return res.json({ ok: false, error: "Błąd" });
    }

    return res.json({
      ok: true,
    });
  }
);

app.post(
  "/api/getLessons",
  [check("mail").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const user: any = await User.findOne({
      email: req.body.mail,
    });

    if (!user) {
      return res.json({ ok: false, error: "Błąd pobierania lekcji" });
    }

    let lessons: any = [];


    try {

      await Promise.all(await user.plannedLessons.map( async(el: any) => {
        let object: any = {};
  
        object.completed = el.completed;
        object.date = el.date;
        object.lessonUrl = el.lessonUrl;
        object.points = el.points;
        object.title = el.title;
  
        if (el.studentMail == req.body.mail) {
          const uInfo: any = await User.findOne({email: el.teacherMail})
  
          object.userName = uInfo.name;
          object.userProfile = uInfo.profileImage;
        } else {
          const uInfo: any = await User.findOne({email: el.studentMail})
  
          object.userName = uInfo.name;
          object.userProfile = uInfo.profileImage;
        }

        lessons.push(object);
      }))
    } catch(err) {
      console.log(err);
    }

    console.log(lessons);

    return res.json({
      ok: true,
      data: lessons,
    });
  }
);

app.put(
  "/api/updateCompletedLesson",
  [check("email").isEmail().trim().escape().normalizeEmail()],
  async (req: express.Request, res: express.Response) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.json({ ok: false, errors: errors.array() });
    }

    try {
      await User.updateOne(
        { email: req.body.email, "plannedLessons.lessonUrl": req.body.url },
        { $set: { "plannedLessons.$.completed": true } }
      );

      res.json({ ok: true });
    } catch (err) {
      console.log(err);
      res.json({
        ok: false,
        errors: [{ msg: "Aktualizacja lekcji się nie powiodła" }],
      });
    }
  }
);

app.post(
  "/api/addFriend",
  [
    check("inviterId").trim().escape(),
    check("friendId").trim().escape()
  ],
  async (req: express.Request, res: express.Response) => {
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      if (req.body.inviterId == req.body.friendId) {
        throw new Error("Dodajesz sam siebie")
      }

      const inviter = await User.updateOne(
        { _id: req.body.inviterId },
        { $addToSet: { friends: { id: req.body.friendId } } },
        { session }
      );
  
      const friend = await User.updateOne(
        { _id: req.body.friendId },
        { $addToSet: { friends: { id: req.body.inviterId } } },
        { session }
      );

      await session.commitTransaction();
      session.endSession();
    } catch (err) {
      await session.abortTransaction();
      session.endSession();
      return res.json({ ok: false, error: "Nie znaleziono." });
    }

    return res.json({
      ok: true,
    });
  }
);

app.listen(port, () => console.log(`Running on port http://localhost:${port}`));
// app.listen(port, 'https://tutorme-backend.onrender.com/', () => console.log('dziala!'));

// https.createServer(options, app).listen(8080, () => {
//   console.log(`HTTPS server started on port 8080`);
// });
