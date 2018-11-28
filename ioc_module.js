'use strict';

const CorrelationRepository = require('./dist/commonjs/index').CorrelationRepository;

function registerInContainer(container) {

  container.register('CorrelationRepository', CorrelationRepository)
    .dependencies('SequelizeConnectionManager')
    .configure('process_engine:correlation_repository')
    .singleton();
}

module.exports.registerInContainer = registerInContainer;
