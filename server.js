const express = require('express');
const { buildSchema } = require('graphql');
const graphqlHTTP = require('express-graphql');
const _ = require('lodash');
const data = require('./data.json');

// Construct a schema, using GraphQL schema language
const schema = buildSchema(`
  type Query {
    infra: Infra,
    tenants: [Tenant],
    tenant(id: String!): Tenant,
    appsForTenant(tenantId: String!, count: Int, afterAppId: String): AppList,
    appForTenant(tenantId: String!, appId: String!): App
  },
  type Mutation {
    addAppForTenant(tenantId: String!, appId: String!, createdBy: String!): App
  }
  type Infra {
    blockTraffic: Boolean,
    tenants: [Tenant]
  },
  type Tenant {
    id: String,
    apps: [App]
  },
  type App {
    id: String,
    created_by: String,
    # Create new scalar type Date
    created_at: Float
  },
  # Need to look more in to creating generic types
  # GraphQl expects all types to be concrete
  # https://stackoverflow.com/questions/49806296/graphql-js-use-interface-as-a-default-fallback-type-in-resolvetype-function
  type AppList {
    count: Int,
    results: [App],
    cursor: String
  }
`);

const getInfra = () => data;
const getTenants = () => data.tenants;
const getTenant = ({ id }) => data.tenants.find(o => o.id === id);
const getAppsForTenant = ({ tenantId, count, afterAppId }) => {
  const MAX_COUNT = 5;
  let start = -1;
  const tenant = data.tenants.find(o => o.id === tenantId);
  if (tenant) {
    if (afterAppId) {
      start = tenant.apps.findIndex(o => o.id === afterAppId);
    }
    const end = start + 1 + (typeof count === 'undefined' ? MAX_COUNT : count);
    const data = tenant.apps.slice(start + 1, end);
    const last = data.slice(-1)[0];
    return {
      count: data.length,
      results: data,
      cursor: last ? last.id : ''
    };
  } else {
    throw new Error(`Tenant id: ${tenantId} doesn't exist`)
  }
};
const getAppForTenant = ({ tenantId, appId }) => {
  const tenant = data.tenants.find(o => o.id === tenantId);
  if (tenant) {
    const app = tenant.apps.find(o => o.id === appId);
    if (app) {
      return app;
    } else {
      throw new Error(`App id: ${appId} doesn't exist`)
    }
  } else {
    throw new Error(`Tenant id: ${tenantId} doesn't exist`)
  }
};
const addAppForTenant = ({ tenantId, appId, createdBy }) => {
  const tenant = data.tenants.find(o => o.id === tenantId);
  if (tenant) {
    tenant.apps.push({
      id: appId,
      created_by: createdBy,
      created_at: Date.now()
    });
    return tenant.apps.slice(-1)[0];
  } else {
    throw new Error(`Tenant id: ${tenantId} doesn't exist`)
  }
}

const root = {
  infra: getInfra,
  tenants: getTenants,
  tenant: getTenant,
  appsForTenant: getAppsForTenant,
  appForTenant: getAppForTenant,
  addAppForTenant: addAppForTenant
};

const app = express();
app.use('/graphql', graphqlHTTP({
  schema: schema,
  rootValue: root,
  graphiql: true,
}));
app.listen(process.env.PORT || 4001)
console.log('Running a GraphQL API server at localhost:4001/graphql');