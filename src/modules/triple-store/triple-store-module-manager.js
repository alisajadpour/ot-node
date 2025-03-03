import BaseModuleManager from '../base-module-manager.js';

class TripleStoreModuleManager extends BaseModuleManager {
    getName() {
        return 'tripleStore';
    }

    async insertAsset(ual, assertionId, assetNquads) {
        if (this.initialized) {
            return this.getImplementation().module.insertAsset(ual, assertionId, assetNquads);
        }
    }

    async insertAssertion(assertionId, assertionNquads) {
        if (this.initialized) {
            return this.getImplementation().module.insertAssertion(assertionId, assertionNquads);
        }
    }

    async insertIndex(keyword, indexNquads, assetNquads) {
        if (this.initialized) {
            return this.getImplementation().module.insertIndex(keyword, indexNquads, assetNquads);
        }
    }

    async assertionExists(uri) {
        if (this.initialized) {
            return this.getImplementation().module.assertionExists(uri);
        }
    }

    async get(uri) {
        if (this.initialized) {
            return this.getImplementation().module.get(uri);
        }
    }

    async construct(query) {
        if (this.initialized) {
            return this.getImplementation().module.construct(query);
        }
    }

    async select(query) {
        if (this.initialized) {
            return this.getImplementation().module.select(query);
        }
    }

    async healthCheck() {
        if (this.initialized) {
            return this.getImplementation().module.healthCheck();
        }
    }
}

export default TripleStoreModuleManager;
