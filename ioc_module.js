'use strict';

const CorrelationRepository = require('./dist/commonjs/index').CorrelationRepository;

function registerInContainer(container) {

  container.register('CorrelationRepository', CorrelationRepository)
    .configure('process_engine:correlation_repository')
    .singleton();
}

module.exports.registerInContainer = registerInContainer;
