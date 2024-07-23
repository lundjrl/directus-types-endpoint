import { defineEndpoint } from '@directus/extensions-sdk';
import { generateTypes } from './services/TypesService';

export default defineEndpoint((router, { getSchema, logger }) => {
    router.get(
        '/',
        async (_, res) =>
            await generateTypes(getSchema, logger).then((text) =>
                res.type('text/plain').send(text),
            ),
    );
});
