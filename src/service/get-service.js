import { Mutex } from 'async-mutex';
import OperationService from './operation-service.js';

import {
    GET_REQUEST_STATUS,
    OPERATION_ID_STATUS,
    GET_STATUS,
    NETWORK_PROTOCOLS,
    ERROR_TYPE,
    OPERATIONS,
} from '../constants/constants.js';

class GetService extends OperationService {
    constructor(ctx) {
        super(ctx);

        this.dataService = ctx.dataService;
        this.tripleStoreModuleManager = ctx.tripleStoreModuleManager;

        this.operationName = OPERATIONS.GET;
        this.networkProtocol = NETWORK_PROTOCOLS.GET;
        this.operationRequestStatus = GET_REQUEST_STATUS;
        this.operationStatus = GET_STATUS;
        this.errorType = ERROR_TYPE.GET.GET_ERROR;
        this.completedStatuses = [
            OPERATION_ID_STATUS.GET.GET_FETCH_FROM_NODES_END,
            OPERATION_ID_STATUS.GET.GET_END,
            OPERATION_ID_STATUS.COMPLETED,
        ];
        this.operationMutex = new Mutex();
    }

    async processResponse(command, responseStatus, responseData, errorMessage = null) {
        const { operationId, numberOfFoundNodes, numberOfNodesInBatch, leftoverNodes, keyword } =
            command.data;

        const keywordsStatuses = await this.getResponsesStatuses(
            responseStatus,
            errorMessage,
            operationId,
            keyword,
        );

        const { completedNumber, failedNumber } = keywordsStatuses[keyword];
        const numberOfResponses = completedNumber + failedNumber;
        this.logger.debug(
            `Processing ${this.networkProtocol} response for operationId: ${operationId}, keyword: ${keyword}. Total number of nodes: ${numberOfFoundNodes}, number of nodes in batch: ${numberOfNodesInBatch} number of leftover nodes: ${leftoverNodes.length}, number of responses: ${numberOfResponses}, Completed: ${completedNumber}, Failed: ${failedNumber}`,
        );

        if (completedNumber === this.getMinimumAckResponses()) {
            await this.markOperationAsCompleted(
                operationId,
                { assertion: responseData.nquads },
                this.completedStatuses,
            );
            this.logResponsesSummary(completedNumber, failedNumber);
        } else if (
            completedNumber < this.getMinimumAckResponses() &&
            (numberOfFoundNodes === failedNumber || failedNumber % numberOfNodesInBatch === 0)
        ) {
            if (leftoverNodes.length === 0) {
                await this.markOperationAsCompleted(
                    operationId,
                    {
                        message: 'Unable to find assertion on the network!',
                    },
                    this.completedStatuses,
                );
                this.logResponsesSummary(completedNumber, failedNumber);
            } else {
                await this.scheduleOperationForLeftoverNodes(command.data, leftoverNodes);
            }
        }
    }

    async localGet(assertionId, operationId) {
        this.logger.debug(`Getting assertion: ${assertionId} for operationId: ${operationId}`);

        let nquads = await this.tripleStoreModuleManager.get(assertionId);
        nquads = await this.dataService.toNQuads(nquads, 'application/n-quads');

        this.logger.debug(
            `Assertion: ${assertionId} for operationId: ${operationId} ${
                nquads.length ? '' : 'not'
            } found in local triple store.`,
        );

        if (nquads.length) {
            this.logger.debug(`Number of n-quads retrieved from the database : ${nquads.length}`);
        }

        return nquads;
    }
}

export default GetService;
