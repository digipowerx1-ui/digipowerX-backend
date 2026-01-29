/**
 * open-position controller
 */

import { factories } from '@strapi/strapi';
import { jdParserService } from '../../../services/jdParser';
import path from 'path';
import fs from 'fs';

export default factories.createCoreController('api::open-position.open-position', ({ strapi }) => ({
  // Keep all default CRUD methods
  async find(ctx) {
    return await super.find(ctx);
  },

  async findOne(ctx) {
    return await super.findOne(ctx);
  },

  async create(ctx) {
    return await super.create(ctx);
  },

  async update(ctx) {
    return await super.update(ctx);
  },

  async delete(ctx) {
    return await super.delete(ctx);
  },

  /**
   * Custom endpoint to parse a JD document and return extracted fields
   * POST /api/open-positions/parse-jd
   */
  async parseJD(ctx) {
    try {
      const { fileId } = ctx.request.body;

      if (!fileId) {
        return ctx.badRequest('fileId is required');
      }

      // Get the file from Strapi's upload plugin
      const file = await strapi.plugin('upload').service('upload').findOne(fileId);

      if (!file) {
        return ctx.notFound('File not found');
      }

      // Check file type
      const allowedExtensions = ['.pdf', '.docx', '.doc'];
      const ext = path.extname(file.name).toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        return ctx.badRequest(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
      }

      // Get the file path
      // For local uploads, the file is stored in public/uploads
      const uploadDir = strapi.dirs.static.public;
      const filePath = path.join(uploadDir, file.url.replace(/^\//, ''));

      if (!fs.existsSync(filePath)) {
        return ctx.notFound('File not found on disk');
      }

      // Parse the document
      const parsedData = await jdParserService.parseDocument(filePath);

      return {
        data: parsedData,
        message: 'JD parsed successfully',
      };
    } catch (error) {
      console.error('Error parsing JD:', error);
      return ctx.internalServerError('Failed to parse JD document');
    }
  },

  /**
   * Custom endpoint to parse JD and create/update an open position
   * POST /api/open-positions/create-from-jd
   */
  async createFromJD(ctx) {
    try {
      const { fileId } = ctx.request.body;

      if (!fileId) {
        return ctx.badRequest('fileId is required');
      }

      // Get the file from Strapi's upload plugin
      const file = await strapi.plugin('upload').service('upload').findOne(fileId);

      if (!file) {
        return ctx.notFound('File not found');
      }

      // Check file type
      const allowedExtensions = ['.pdf', '.docx', '.doc'];
      const ext = path.extname(file.name).toLowerCase();

      if (!allowedExtensions.includes(ext)) {
        return ctx.badRequest(`Invalid file type. Allowed types: ${allowedExtensions.join(', ')}`);
      }

      // Get the file path
      const uploadDir = strapi.dirs.static.public;
      const filePath = path.join(uploadDir, file.url.replace(/^\//, ''));

      if (!fs.existsSync(filePath)) {
        return ctx.notFound('File not found on disk');
      }

      // Parse the document
      const parsedData = await jdParserService.parseDocument(filePath);

      // Create the open position with parsed data
      const entry = await strapi.documents('api::open-position.open-position').create({
        data: {
          jdDocument: fileId,
          title: parsedData.title || 'Untitled Position',
          location: parsedData.location,
          reportsTo: parsedData.reportsTo,
          roleSummary: parsedData.roleSummary,
          responsibilities: parsedData.responsibilities,
          requiredExperience: parsedData.requiredExperience,
          preferredExperience: parsedData.preferredExperience,
          successCriteria: parsedData.successCriteria,
          resumeWeightage: parsedData.resumeWeightage || 50,
          problemSolutioningWeightage: parsedData.problemSolutioningWeightage || 50,
          problemSolutioningQuestions: parsedData.problemSolutioningQuestions,
          evaluationCriteria: parsedData.evaluationCriteria,
        },
      });

      return {
        data: entry,
        parsedFields: parsedData,
        message: 'Open position created successfully from JD',
      };
    } catch (error) {
      console.error('Error creating from JD:', error);
      return ctx.internalServerError('Failed to create open position from JD');
    }
  },
}));
