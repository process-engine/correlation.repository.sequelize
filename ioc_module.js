'use strict';

const CorrelationRepository = require('./dist/commonjs/index').CorrelationRepository;
const disposableDiscoveryTag = require('@essential-projects/bootstrapper_contracts').disposableDiscoveryTag;

function registerInContainer(container) {

  container.register('CorrelationRepository', CorrelationRepository)
    .dependencies('SequelizeConnectionManager')
    .configure('process_engine:correlation_repository')
    .tags(disposableDiscoveryTag)
    .singleton();
}

module.exports.registerInContainer = registerInContainer;
