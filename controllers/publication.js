import Publication from '../models/publications.js';
import { followUserIds } from '../services/followServices.js';

export const testPublication = (req, res) => {
  return res.status(200).send({
    message: "Mensaje enviado desde el controlador de Publication"
  });
};

export const savePublication = async (req, res) => {
  try {
    const params = req.body;

    if(!params.text){
      return res.status(400).send({
        status: "error",
        message: "Debes enviar el texto de la publicación realizada"
      });
    }

    let newPublication = new Publication(params);

    newPublication.user_id = req.user.userId;

    const publicationStored = await newPublication.save();

    if(!publicationStored){
      return res.status(500).send({
        status: "error",
        message: "No se ha guardado la publicación"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "¡Publicación creada con éxito!",
      publicationStored
    });

  } catch (error) {
    console.log(`Error al crear la publicación: ${ error }`);
    return res.status(500).send({
      status: "error",
      message: "Error al crear la publicación"
    });
  }
};

export const showPublication = async (req, res) => {
  try {
    const publicationId = req.params.id;

    const publicationStored = await Publication.findById(publicationId).populate('user_id', 'name last_name nick image');

    if(!publicationStored){
      return res.status(404).send({
        status: "error",
        message: "No existe la publicación"
      });
    }

    // Devolvemos respuesta exitosa
    return res.status(200).json({
      status: "success",
      message: "Publicación encontrada",
      publication: publicationStored
    });

  } catch (error) {
    console.log(`Error al mostrar la publicación: ${ error }`);
    return res.status(500).send({
      status: "error",
      message: "Error al mostrar la publicación"
    });
  }
};

// Método para eliminar una publicación
export const deletePublication = async (req, res) => {
  try {
    const publicationId = req.params.id;

    const publicationDeleted = await Publication.findOneAndDelete({ user_id: req.user.userId, _id: publicationId}).populate('user_id', 'name last_name');

    if(!publicationDeleted){
      return res.status(404).send({
        status: "error",
        message: "No se ha encontrado o no tienes permiso para eliminar esta publicación"
      });
    }

    // Devolvemos respuesta exitosa
    return res.status(200).json({
      status: "success",
      message: "Publicación eliminada con éxito",
      publication: publicationDeleted
    });

  } catch (error) {
    console.log(`Error al eliminar la publicación: ${ error }`);
    return res.status(500).send({
      status: "error",
      message: "Error al eliminar la publicación"
    });
  }
};

// Método para listar publicaciones de un usuario en particular, enviándole el id del usuario en los parámetros de la URL de la petición (endpoint)
export const publicationsUser = async (req, res) => {
  try {
    // Obtener el ID del usuario
    const userId = req.params.id;

    // Asignar el número de página a mostrar inicialmente
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Número de publicaciones que queremos mostrar por página
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    // Opciones de la consulta
    const options = {
      page: page,
      limit: itemsPerPage,
      sort: { created_at: -1 },
      populate: {
        path: 'user_id',
        select: '-password -role -__v -email'
      },
      lean: true
    };

    // Buscar las publicaciones del usuario
    const publications = await Publication.paginate({ user_id: userId}, options);

    // Verificar si existen publicaciones
    if(!publications.docs || publications.docs.length <= 0){
      return res.status(404).send({
        status: "error",
        message: "No hay pulicaciones para mostrar"
      });
    }

    // Devolver respuesta exitosa
    return res.status(200).json({
      status: "success",
      message: "Publicaciones del usuario: ",
      publications: publications.docs,
      total: publications.totalDocs,
      pages: publications.totalPages,
      page: publications.page,
      limit_items_ppage: publications.limit
    });

  } catch (error) {
    console.log(`Error al mostrar las publicaciones: ${ error }`);
    return res.status(500).send({
      status: "error",
      message: "Error al mostrar las publicaciones"
    });
  }
};

// Método para subir imágenes a las publicaciones
export const uploadMedia = async (req, res) => {
  try {
    // Obtener el ID de la publicación
    const publicationId = req.params.id;

    // Verificar si la publicación existe en la BD
    const publicationExists = await Publication.findById(publicationId);

    if(!publicationExists){
      return res.status(404).send({
        status: "error",
        message: "No existe la publicación"
      });
    }

    // Verificar si se ha recibido en la petición un archivo
    if(!req.file){
      return res.status(400).send({
        status: "error",
        message: "La petición no incluye la imagen de la publicacion"
      });
    }

    // Obtener la URL de Cloudinary
    const mediaUrl = req.file.path;

    // Actualizar la publicación con la URL de la imagen
    const publicationUpdated = await Publication.findByIdAndUpdate(
      publicationId,
      { file: mediaUrl },
      { new: true}
    );

    if(!publicationUpdated){
      return res.status(500).send({
        status: "error",
        message: "Error en la subida de la imagen"
      });
    }

    // Devolver respuesta exitosa
    return res.status(200).json({
      status: "success",
      message: "Archivo subido con éxito",
      publication: publicationUpdated,
      file: mediaUrl
    });

  } catch (error) {
    console.log(`Error al mostrar las publicaciones: ${ error }`);
    return res.status(500).send({
      status: "error",
      message: "Error al mostrar las publicaciones realizadas"
    });
  }
};

export const showMedia = async (req, res) => {
  try {
    // Obtener el id de la publicación
    const publicationId = req.params.id;

    // Buscar la publicación en la base de datos
    const publication = await Publication.findById(publicationId).select('file');

    // Verificar si la publicación existe y tiene un archivo
    if (!publication || !publication.file) {
      return res.status(404).send({
        status: "error",
        message: "No existe el archivo para esta publicación"
      });
    }

    return res.redirect(publication.file);

  } catch (error) {
    console.error("Error al mostrar el archivo de la publicación", error);
    return res.status(500).send({
      status: "error",
      message: "Error al mostrar archivo en la publicación"
    });
  }
}

// Método para listar todas las publicaciones de los usuarios que yo sigo (Feed)
export const feed = async (req, res) => {
  try {
    // Asignar el número de página
    let page = req.params.page ? parseInt(req.params.page, 10) : 1;

    // Número de publicaciones que queremos mostrar por página
    let itemsPerPage = req.query.limit ? parseInt(req.query.limit, 10) : 5;

    if(!req.user || !req.user.userId) {
      return res.status(404).send({
        status: "error",
        message: "Usuario no autenticado en el sistema"
      });
    }

    const myFollows = await followUserIds(req);

    if (!myFollows.following || myFollows.following.length === 0){
      return res.status(404).send({
        status: "error",
        message: "No sigues a ningún usuario, no hay publicaciones que mostrar"
      });
    }

import express from "express";
import connection from "./database/connection.js";
import cors from "cors";
import bodyParser from "body-parser";
import UserRoutes from "./routes/users.js";
import PublicationRoutes from "./routes/publications.js";
import FollowRoutes from "./routes/follows.js";


console.log("API Node en ejecución");

// Usar la conexión a la Base de Datos
connection();

// Crear el servidor Node
const app = express();
const puerto = process.env.PORT || 3900;

// Configurar cors para que acepte peticiones del frontend
app.use(cors({
  origin: '*',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Decodificar los datos desde los formularios para convertirlos en objetos de JavaScript
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configurar rutas del aplicativo (módulos)
app.use('/api/user', UserRoutes);
app.use('/api/publication', PublicationRoutes);
app.use('/api/follow', FollowRoutes);

app.listen(puerto, () => {
  console.log("Servidor de Node ejecutándose en el puerto", puerto);
});

export default app;
    const options = {
      page: page,
      limit: itemsPerPage,
      sort: { created_at: -1 },
      populate: {
        path: 'user_id',
        select: '-password -role -__v -email'
      },
      lean: true
    };

    // Consulta a la base de datos con paginate
    const result = await Publication.paginate(
      { user_id: { $in: myFollows.following }},
      options
    );

    if (!result.docs || result.docs.length <= 0) {
      return res.status(404).send({
        status: "error",
        message: "No hay publicaciones para mostrar"
      });
    }

    return res.status(200).json({
      status: "success",
      message: "Feed de Publicaciones",
      publications: result.docs,
      total: result.totalDocs,
      pages: result.totalPages,
      page: result.page,
      limit: result.limit
    });

  } catch (error) {
    return res.status(500).send({
      status: "error",
      message: "Error al mostrar las publicaciones en el feed"
    });
  }
}