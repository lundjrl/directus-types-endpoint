# Types Endpoint for Directus

   <a href="https://opensource.org/licenses/MIT">
          <img alt="License MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg?color=blue" />
        </a>

This extension exposes your Directus schema to an endpoint.
It is specifically designed to be passed as the "SCHEMA" interface in the Directus client SDK but is certainly not limited to that.

> [!IMPORTANT]  
> This work was greatly inspired from [maltejur's generate types extension](https://www.npmjs.com/package/directus-extension-generate-types),
> however our team needed something that would expose an endpoint and work with newer versions of Directus. We sincerely hope you find it useful ☺️

> [!WARNING]  
> It is not recommended to expose your database schema in production. We use this tool to generate a types file and commit it to git.
> We recommend you do the same.

## Requirements

This extensions only works with Directus 10 and higher.

## Installation

Add `directus-extension-types` as a dependency to your directus app.

```bash
# Using npm
npm install directus-extension-types
# Using bun
bun install directus-extension-types
# Using yarn
yarn add directus-extension-types
# Using pnpm
pnpm add directus-extension-types
```

## Usage

### Getting types

After installation, the extension should be good to go.
To get your types, you'll need to make an HTTP GET request to the `/types` endpoint of your application.

Examples: 
- Default configuration: `http://localhost:8055/types`
- Set spaces as 4 and use trailing semicolons: `http://localhost:8055/types?spaces=4&trailingSemicolons=true`
- Use tabs instead of spaces: `http://localhost:8055/types?spaces=1&useTabs=true`


### Using types

This endpoint is typically used to auto-generate the `SCHEMA` interface for the Directus client sdk.

The endpoint has a type called `CustomDirectusTypes`, this is your `SCHEMA` interface. Use that in your client SDK and see your types match the model of your back-end.
