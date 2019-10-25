'use strict';

const pluralize = require('pluralize');

const createComponentModels = async ({ model, definition, ORM, GLOBALS }) => {
  const { collectionName, primaryKey } = definition;

  const componentAttributes = Object.keys(definition.attributes).filter(
    key => definition.attributes[key].type === 'component'
  );

  if (componentAttributes.length > 0) {
    // create component model
    const joinTable = `${collectionName}_components`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;
    const joinModel = ORM.Model.extend({
      requireFetch: false,
      tableName: joinTable,
      component() {
        return this.morphTo(
          'component',
          ...componentAttributes.map(key => {
            const componentKey = definition.attributes[key].component;
            return GLOBALS[strapi.components[componentKey].globalId];
          })
        );
      },
    });

    joinModel.foreignKey = joinColumn;
    definition.componentsJoinModel = joinModel;

    componentAttributes.forEach(name => {
      model[name] = function relation() {
        return this.hasMany(joinModel).query(qb => {
          qb.where('field', name).orderBy('order');
        });
      };
    });
  }
};

const createComponentJoinTables = async ({ definition, ORM }) => {
  const { collectionName, primaryKey } = definition;

  const componentAttributes = Object.keys(definition.attributes).filter(
    key => definition.attributes[key].type === 'component'
  );

  if (componentAttributes.length > 0) {
    const joinTable = `${collectionName}_components`;
    const joinColumn = `${pluralize.singular(collectionName)}_${primaryKey}`;

    if (await ORM.knex.schema.hasTable(joinTable)) return;

    await ORM.knex.schema.createTable(joinTable, table => {
      table.increments();
      table.string('field').notNullable();
      table
        .integer('order')
        .unsigned()
        .notNullable();
      table.string('component_type').notNullable();
      table.integer('component_id').notNullable();
      table.integer(joinColumn).notNullable();

      table
        .foreign(joinColumn)
        .references(primaryKey)
        .inTable(collectionName)
        .onDelete('CASCADE');
    });
  }
};

module.exports = {
  createComponentModels,
  createComponentJoinTables,
};