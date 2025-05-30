const swaggerJsdoc = require("swagger-jsdoc");
const swaggerUi = require("swagger-ui-express");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Auth System API",
      version: "1.0.0",
      description: "Node.js authentication system with local and Google OAuth",
    },
    servers: [
      {
        url: "http://localhost:5000",
      },
    ],
  },
  apis: ["./Routes/AuthRoutes.js"], // adjust path if needed
};

const swaggerSpec = swaggerJsdoc(options);

function setupSwaggerDocs(app) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  console.log("📚 Swagger docs available at http://localhost:5000/api-docs");
}

module.exports = setupSwaggerDocs;
