import swaggerJSDoc from "swagger-jsdoc";

const options = {
    definition: {
        openapi: '3.2.0',
        info: {
            title: 'Rate Limiter',
            version: '1.0.0',
            description: "API documentation",
        },
    },
    apis: ['./src/app.js'], // files with annotations
};

const openapiSpecification = swaggerJSDoc(options);

export default openapiSpecification;