FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

# Set Playwright to use a shared cache directory
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

COPY package.json package-lock.json* ./

RUN npm install

# Install Playwright browsers as root in shared location
RUN npx playwright install chromium && \
    chmod -R 777 /ms-playwright

COPY . /app

# Ensure tmp directory exists and is writable by Playwright user
RUN mkdir -p /app/tmp && \
    chown -R pwuser:pwuser /app/tmp && \
    chown -R pwuser:pwuser /app

# Run container as Playwright user
USER pwuser

ENV NODE_ENV=development

EXPOSE 5177

CMD ["npm", "run", "dev"]
