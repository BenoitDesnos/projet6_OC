const Sauce = require("../models/Sauce");
const fs = require("fs");
const { log } = require("console");

exports.likeToggleSauce = (req, res, next) => {
  if (req.body.like == 1) {
    Sauce.updateOne(
      // on filtre grace à l'id présent dans l'url
      { _id: req.params.id },
      // on ajoute l'userId dans le tableau des users ayant aimé && on incrémente le like dans la variable likes
      { $push: { usersLiked: req.body.userId }, $inc: { likes: 1 } }
    )
      .then(() => res.status(200).json({ message: "objet liké" }))
      .catch((error) => res.status(401).json({ error }));
  } else if (req.body.like == -1) {
    Sauce.updateOne(
      // on filtre grace à l'id présent dans l'url
      { _id: req.params.id },

      {
        // on ajoute l'userId dans le tableau des users n'ayant pas aimé && on incrémente le dislike dans la variable dislikes
        $push: { usersDisliked: req.body.userId },
        $inc: { dislikes: 1 },
      }
    )
      .then(() => res.status(200).json({ message: "objet liké" }))
      .catch((error) => res.status(401).json({ error }));
  } else if (req.body.like == 0) {
    // on recherche la sauce grace au filtre de l'id présent dans l'url && on récupère la data présente dans l'api correspondant à l'id
    Sauce.findOne({ _id: req.params.id }).then((sauce) => {
      log(sauce);
      let isLikedByUser = false;
      // si l'userId est présent dans le tableau usersliked alors on confirme que l'user avait liké la sauce en passant la variable islikedbyuser sur true
      for (i = 0; i < sauce.usersLiked.length; i++) {
        if (sauce.usersLiked[i] == req.body.userId) {
          isLikedByUser = true;
        }
      }
      // si l'utilisateur n'avait pas liké cela veut dire qu'il avait disliké
      if (isLikedByUser == false) {
        Sauce.updateOne(
          // on filtre
          { _id: req.params.id },
          {
            // on retire l'user du tableau des userdisliked && on décrémente les dislikes
            $pull: { usersDisliked: req.body.userId },
            $inc: { dislikes: -1 },
          }
        )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
      } else {
        Sauce.updateOne(
          // on filtre
          { _id: req.params.id },
          {
            // on retire l'user du tableau des userliked && on décrémente les likes
            $pull: { usersLiked: req.body.userId },
            $inc: { likes: -1 },
          }
        )
          .then(() => res.status(200).json({ message: "Objet modifié !" }))
          .catch((error) => res.status(400).json({ error }));
      }
    });
  }
};

exports.createSauce = (req, res, next) => {
  // On récupère la sauce présente dans le body et on la parse
  const sauceObject = JSON.parse(req.body.sauce);
  log(sauceObject);
  // VOIR PK DELETE ID ET USERID
  // avec log aucun n'id de visible fait par la base de donnée
  delete sauceObject._id;
  // ne pas faire confiance au client
  delete sauceObject._userId;
  // en cours de compréhension
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
  });
  console.log(req.protocol);
  console.log(req.get("host"));
  console.log(req.file);
  console.log(sauce);

  sauce
    .save()
    .then(() => {
      res.status(201).json({ message: "Objet enregistré !" });
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};

exports.displayAllSauces = (req, res, next) => {
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.displayOneSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  const sauceObject = req.file
    ? {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : { ...req.body };

  delete sauceObject._userId;
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        Sauce.updateOne(
          { _id: req.params.id },
          { ...sauceObject, _id: req.params.id }
        )
          .then(() => res.status(200).json({ message: "Objet modifié!" }))
          .catch((error) => res.status(401).json({ error }));
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};
exports.deleteSauce = (req, res, next) => {
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        const filename = sauce.imageUrl.split("/images/")[1];
        fs.unlink(`images/${filename}`, () => {
          Sauce.deleteOne({ _id: req.params.id })
            .then(() => {
              res.status(200).json({ message: "Objet supprimé !" });
            })
            .catch((error) => res.status(401).json({ error }));
        });
      }
    })
    .catch((error) => {
      res.status(500).json({ error });
    });
};
