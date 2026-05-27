import swaggerJsdoc from 'swagger-jsdoc';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'NewRa Grids API',
      version: '1.0.0',
      description: 'Solar Intelligence Platform - Backend API Documentation',
      contact: {
        name: 'NewRa Grids',
        email: 'support@newragrids.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}${process.env.API_PREFIX || '/api/v1'}`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./routes/*.ts', './controllers/*.ts'],
};

export const swaggerSpec = swaggerJsdoc(options);

