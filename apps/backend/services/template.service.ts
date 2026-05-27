import handlebars from 'handlebars';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.service.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Email template service using Handlebars
 */
class TemplateService {
  private templates: Map<string, handlebars.TemplateDelegate> = new Map();
  private initialized = false;

  /**
   * Initialize the template service by registering partials
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.registerPartials();
      this.initialized = true;
      logger.info('Template service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize template service', 'error', {}, error as Error);
      throw error;
    }
  }

  /**
   * Register Handlebars partials from the partials directory
   */
  private async registerPartials(): Promise<void> {
    const partialsPath = path.join(__dirname, '../email-templates/partials');

    if (!fs.existsSync(partialsPath)) {
      logger.warn('Partials directory not found, skipping partial registration');
      return;
    }

    const partialFiles = fs.readdirSync(partialsPath).filter(file => file.endsWith('.html'));

    for (const partialFile of partialFiles) {
      const partialName = path.parse(partialFile).name;
      const partialPath = path.join(partialsPath, partialFile);
      const partialContent = fs.readFileSync(partialPath, 'utf-8');

      handlebars.registerPartial(partialName, partialContent);
      logger.info(`Registered partial: ${partialName}`);
    }
  }

  /**
   * Load and compile a template
   */
  private loadTemplate(templateName: string): handlebars.TemplateDelegate {
    if (this.templates.has(templateName)) {
      return this.templates.get(templateName)!;
    }

    const templatePath = path.join(__dirname, '../email-templates', `${templateName}.html`);

    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template not found: ${templateName}`);
    }

    const templateSource = fs.readFileSync(templatePath, 'utf-8');
    const compiledTemplate = handlebars.compile(templateSource);

    this.templates.set(templateName, compiledTemplate);
    return compiledTemplate;
  }

  /**
   * Render a template with provided data
   */
  async renderTemplate(templateName: string, data: Record<string, any>): Promise<string> {
    await this.initialize();

    try {
      const template = this.loadTemplate(templateName);
      return template(data);
    } catch (error) {
      logger.error(`Failed to render template: ${templateName}`, 'error', { templateName }, error as Error);
      throw error;
    }
  }

  /**
   * Get both HTML and text versions of an email template
   */
  async renderEmailTemplate(
    templateName: string,
    data: Record<string, any>
  ): Promise<{ html: string; text: string }> {
    const html = await this.renderTemplate(templateName, data);

    // For text version, we could either:
    // 1. Create separate .txt templates
    // 2. Strip HTML tags from HTML version
    // 3. Use a library to convert HTML to text

    // For now, we'll create a simple HTML to text converter
    const text = this.htmlToText(html);

    return { html, text };
  }

  /**
   * Simple HTML to text converter for email text versions
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<[^>]+>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newline
      .trim();
  }

  /**
   * Clear template cache (useful for development)
   */
  clearCache(): void {
    this.templates.clear();
    logger.info('Template cache cleared');
  }
}

// Export singleton instance
export const templateService = new TemplateService();
