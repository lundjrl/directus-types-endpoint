import { toPascalCase } from '../utils/toPascalCase';
import { toSingular } from '../utils/toSingular';
import { getTabSpaceCount } from '../utils/getTabSpaceCount';
import { maybeAddTrailingSlash } from '../utils/maybeAddTrailingSlash';

import type { EndpointExtensionContext } from '@directus/extensions';
import type { Field, FieldOverview } from '@directus/types';

type GetSchema = EndpointExtensionContext['getSchema'];
type SCHEMA = Awaited<ReturnType<GetSchema>>;
type Logger = EndpointExtensionContext['logger'];

type S = SCHEMA['collections'];

type COLLECTION = {
    collection: S[keyof S]['collection'];
    primary: S[keyof S]['primary'];
    singleton: S[keyof S]['singleton'];
    sortField: S[keyof S]['sortField'];
    note: S[keyof S]['note'];
    accountability: S[keyof S]['accountability'];
    fields: {
        [name: string]: FieldOverview & {
            schema: Field['schema'];
            meta: Field['meta'];
        };
    };
    s: S[keyof S]['fields'];
    system?: boolean;
    hasCustomFields: boolean;
};

export type GenerateTypesOptions = {
    spaces: number;
    useTabs: boolean;
    trailingSemicolons: boolean;
};

const directusTypes = new Set();
directusTypes.add('PrimaryKey');

const getCollections = (schema: SCHEMA, logger: Logger) => {
    if (!schema || typeof schema !== 'object') return {};
    if (!schema['relations']) return {};

    const collections = ((Object.keys(schema.collections) ?? {})
        .map((key) => schema.collections[key])
        .filter((el) => !!el) ?? []) as unknown as COLLECTION[];

    return getRelations(schema, collections, logger);
};

const maybeTrimDirectusCollection = (collectionName: string) => {
    if (collectionName.substring(0, 8) === 'Directus') {
        const directusCollectionName = collectionName.substring(
            8,
            collectionName.length,
        );
        directusTypes.add(`${directusCollectionName} as ${collectionName}`);
        return directusCollectionName;
    }
    return collectionName;
};

const getRelationType = (field) => {
    const key = field?.schema?.foreign_key_column ?? 'id';
    const collection = maybeTrimDirectusCollection(
        toSingular(toPascalCase(field.relation.collection)),
    );

    return `${collection}['${key}'] | Partial<${collection}>`;
};

const getType = (field: COL['relations'][0]) => {
    let type: string = '';
    if (field?.relation?.type === 'many') {
        type = 'any[]';
    }
    if (field.relation) {
        if (type) type += ' | ';
        type += field.relation.collection ? getRelationType(field) : 'any';
        if (field.relation.type === 'many') type += '[]';
    }

    if (!field?.relation?.collection) {
        if (['integer', 'bigInteger', 'float', 'decimal'].includes(field.type))
            type = 'number';
        else if ('boolean'.includes(field.type)) type = 'boolean';
        else if (['json', 'csv'].includes(field.type)) type = 'unknown';
        else if (
            ['hash', 'string', 'text', 'timestamp', 'uuid'].includes(field.type)
        )
            type = 'string';
        else if (!field.type) type = 'unknown';
        else type = 'string';
    }
    if (field.nullable) {
        type += ` | null`;
    }
    return type;
};

type COL = COLLECTION & {
    relations: SCHEMA['relations'];
};

type INDEXED = {
    [key: string]: COL;
};

const mapCollectionObject = (schema: SCHEMA, collections: COLLECTION[]) => {
    const col: INDEXED = {};

    collections.forEach((collection) => {
        if (!collection?.collection) return;

        const key: string = collection.collection;

        col[key] = {
            ...collection,
            prevFields: collection.fields,
            relations: [],
        };
    });

    const fields = [...schema.relations].sort((a, b) =>
        a.field.localeCompare(b.field),
    );

    fields.forEach((field) => {
        if (!col[field.collection]) return;

        col[field.collection]?.relations.push(field);
    });

    return col;
};

const getRelations = (
    schema: SCHEMA,
    collections: COLLECTION[],
    logger: Logger,
) => {
    if (!schema || typeof schema !== 'object') return {};
    if (!collections?.length) return {};

    const col = mapCollectionObject(schema, collections);

    schema.relations.forEach((relation) => {
        if (!relation.meta) {
            logger.warn(
                `Relation on field '${relation.field}' in collection '${relation.collection}' has no meta. Maybe missing a relation inside directus_relations table.`,
            );
            return;
        }

        if (!relation?.meta?.one_collection) return [];

        const oneField = col[relation.meta.one_collection]?.relations.find(
            (field) => field.field === relation.meta?.one_field,
        );

        const manyField = col[relation.meta.many_collection]?.relations.find(
            (field) => field.field === relation.meta?.many_field,
        );

        // TODO: What does this section even do? We don't use these relations later?
        if (oneField)
            oneField.relation = {
                type: 'many',
                collection: relation.meta.many_collection,
            };

        if (manyField)
            manyField.relation = {
                type: 'one',
                collection: relation.meta.one_collection,
            };

        return;
    });

    return col;
};

export const generateTypes = async (
    { getSchema, logger, services }: EndpointExtensionContext,
    options: GenerateTypesOptions,
) => {
    if (!getSchema || typeof getSchema !== 'function') {
        return [];
    }
    const schema = await getSchema();

    const fieldsService = new services.FieldsService({
        schema,
    });

    const collections = getCollections(schema, logger);

    const fields = await fieldsService.readAll();
    fields.forEach((field) => {
        const collectionName = field.collection;
        const fieldName = field.field;
        if (
            collections[collectionName] &&
            collections[collectionName].fields &&
            collections[collectionName].fields[fieldName]
        ) {
            if (
                collectionName.includes('directus') &&
                field.meta?.system === true
            ) {
                collections[collectionName].system = field.meta?.system;
            }
            if (!field.meta?.system) {
                collections[collectionName].hasCustomFields = true;
            }
            collections[collectionName].fields[fieldName].schema = field.schema;
            collections[collectionName].fields[fieldName].meta = field.meta;
        }
    });

    let ret = '';
    const types: string[] = [];

    Object.values(collections)
        .sort((a, b) => {
            if (a.collection < b.collection) {
                return -1;
            }
            if (a.collection > b.collection) {
                return 1;
            }
            return 0;
        })
        .forEach((collection) => {
            if (collection.system === true && !collection.hasCustomFields) {
                return;
            }

            const collectionName = toSingular(collection.collection);
            const typeName = toPascalCase(collectionName);
            const isSingleton = collection?.singleton === true;

            if (collection.system === true) {
                const customDirectusCollectionName = `${collectionName.substring(
                    'directus_'.length,
                )}`;
                const customDirectusTypeName = `${typeName.substring(
                    'Directus'.length,
                )}`;
                types.push(
                    maybeAddTrailingSlash(
                        `${customDirectusCollectionName}: ${customDirectusTypeName}${
                            isSingleton ? '' : '[]'
                        }`,
                        options.trailingSemicolons,
                    ),
                );
                ret += `export type ${customDirectusTypeName} = ${typeName} & {\n`;

                Object.values(collection.fields).forEach((field) => {
                    if (field.meta?.system) {
                        if (collection.fields[field.field]) {
                            delete collection.fields[field.field];
                        }
                        if (collection.prevFields[field.field]) {
                            delete collection.prevFields[field.field];
                        }
                        if (collection.relations[field.field]) {
                            delete collection.relations[field.field];
                        }
                    }
                });
            } else {
                types.push(
                    maybeAddTrailingSlash(
                        `${collectionName}: ${typeName}${
                            isSingleton ? '' : '[]'
                        }`,
                        options.trailingSemicolons,
                    ),
                );
                ret += `export type ${typeName} = {\n`;
            }

            // Remove fields that have an association with another table.
            collection.relations.forEach((relation, i) => {
                if (collection.prevFields[relation.field])
                    delete collection.prevFields[relation.field];
                if (relation.meta?.system) delete collection.relations[i];
            });

            // Fields with primitive types
            Object.entries(collection.prevFields).forEach(([key, value]) => {
                ret += getTabSpaceCount(options.spaces, options.useTabs);
                ret += key.includes('-') || key.includes('_') ? `${key}` : key;
                if (value.field === collection.primary) {
                    ret += `${maybeAddTrailingSlash(
                        ': PrimaryKey',
                        options.trailingSemicolons,
                    )}\n`;
                    return;
                }

                ret += maybeAddTrailingSlash(
                    `: ${getType(value)}`,
                    options.trailingSemicolons,
                );
                ret += '\n';
            });

            // TODO: Make sure to handle partial fields on a type.

            // Related fields - fields with relations
            collection.relations.forEach((field) => {
                ret += getTabSpaceCount(options.spaces, options.useTabs);
                ret +=
                    field.field.includes('-') || field.field.includes('_')
                        ? `${field.field}`
                        : field.field;
                ret += maybeAddTrailingSlash(
                    `: ${getType(field)}`,
                    options.trailingSemicolons,
                ); // TODO: Add ?: here for partials if needed
                ret += '\n';
            });

            ret += `${maybeAddTrailingSlash(
                '}',
                options.trailingSemicolons,
            )}\n\n`;
        });

    ret +=
        'export type CustomDirectusTypes = {\n' +
        types.map((x) => `  ${x}`).join('\n') +
        '\n}';

    ret += '\n';

    ret = `import { ${Array.from(directusTypes)
        .sort()
        .join(', ')} } from '@directus/types'${maybeAddTrailingSlash(
        '',
        options.trailingSemicolons,
    )}\n\n${ret}`;

    return ret;
};
