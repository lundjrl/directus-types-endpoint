import { defineEndpoint } from '@directus/extensions-sdk';
import { generateTypes } from './services/TypesService';
import type { GenerateTypesOptions } from './services/TypesService';

export default defineEndpoint((router, { getSchema, logger }) => {
    router.get('/', async (req, res) => {
        try {
            res.type('text/plain');
            res.status(200);

            const options: GenerateTypesOptions = {
                spaces: req.query.spaces
                    ? Math.floor(parseInt(req.query.spaces?.toString()))
                    : 2,
                useTabs: req.query.useTabs === 'true',
                trailingSemicolons: req.query.trailingSemicolons === 'true',
            };
            await generateTypes(getSchema, logger, options).then((text) =>
                res.send(text),
            );
        } catch (error) {
            logger.error(error);
            res.status(500);
            if (error instanceof Error) {
                res.send(error.message);
                return;
            }
            res.send(JSON.stringify(error));
        }
    });
});
