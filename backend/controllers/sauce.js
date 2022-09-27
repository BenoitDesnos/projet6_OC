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
      .then(() => res.status(200).json({ message: "objet disliké" }))
      .catch((error) => res.status(401).json({ error }));
    // si req.body.like ==  0 alors le client avait liké ou disliké avant la requête
  } else if (req.body.like == 0) {
    // on recherche la sauce grace au filtre de l'id présent dans l'url && on récupère la data présente dans l'api correspondant à l'id
    Sauce.findOne({ _id: req.params.id }).then((sauce) => {
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
// < ------------------------------------------------------------------ DEUX FACON DE FAIRE ASYNC AWAIT ET .THEN------------------------------------------->

exports.createSauce = async (req, res, next) => {
  // On récupère la sauce présente dans le body et on la parse
  const sauceObject = JSON.parse(req.body.sauce);
  // ne pas faire confiance au client
  delete sauceObject.userId;
  // on créé une const sauce grace à sauceObject + on rajoute les champs manquant userId et imageUrl, _id est créé par mongoose.
  const sauce = new Sauce({
    ...sauceObject,
    userId: req.auth.userId,
    // on utilise l'url créé avec multer
    imageUrl: `${req.protocol}://${req.get("host")}/images/${
      req.file.filename
    }`,
  });
  // on sauvegarde la sauce comme résultat dans l'api
  try {
    sauce.save();
    res.status(201).json({ message: "Sauce enregistrée !" });
  } catch (error) {
    res.status(400).json({ error });
  }
};

// < -------------------------------------------------------------------------------------------------------------------------------------->

exports.displayAllSauces = (req, res, next) => {
  // find() permet de récuperer toutes les sauces dans l'api et des les envoyer au frontend
  Sauce.find()
    .then((sauces) => res.status(200).json(sauces))
    .catch((error) => res.status(400).json({ error }));
};

exports.displayOneSauce = (req, res, next) => {
  // findOne() permet de récuperer une sauce dans l'api à l'aide du filtre et de l'envoyer au frontend
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => res.status(200).json(sauce))
    .catch((error) => res.status(404).json({ error }));
};

exports.modifySauce = (req, res, next) => {
  // verifie si un file (image) est présent dans la requete
  const sauceObject = req.file
    ? // si changement d'image l'objet renvoyé est un string
      {
        ...JSON.parse(req.body.sauce),
        imageUrl: `${req.protocol}://${req.get("host")}/images/${
          req.file.filename
        }`,
      }
    : // si pas de changement d'image l'objet est renvoyé en respectant le schema
      { ...req.body };

  //on supprime l'userId pour des questions de sécurité
  delete sauceObject.userId;

  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // on vérifie si l'user à le droit d'effectuer la modification
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        Sauce.updateOne(
          { _id: req.params.id },
          // on update les objets présent dans sauceObject
          { ...sauceObject }
        )
          .then(() => res.status(200).json({ message: "Objet modifié!" }))
          /*  .then((data) => {
            console.log(data.body);
          }) */
          .catch((error) => res.status(401).json({ error }));
        /*  Sauce.findOne({ _id: req.params.id }, {}).then((sauce) => {
          console.log(sauce);
        }); */
      }
    })
    .catch((error) => {
      res.status(400).json({ error });
    });
};
exports.deleteSauce = (req, res, next) => {
  // on filtre la sauce grace à l'id de l'url
  Sauce.findOne({ _id: req.params.id })
    .then((sauce) => {
      // on verifie s'il s'agit bien du bon user
      if (sauce.userId != req.auth.userId) {
        res.status(401).json({ message: "Not authorized" });
      } else {
        //si il s'agit du bon user, on récupère le nom de l'image grace à split()
        const filename = sauce.imageUrl.split("/images/")[1];
        console.log(filename);
        // on supprime l'image de repository images/ gràce à fs
        fs.unlink(`images/${filename}`, () => {
          // on supprime la sauce de l'api grace à deleteOne()
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
