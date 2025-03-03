import { When, Given } from '@cucumber/cucumber';
import { expect, assert } from 'chai';
import { setTimeout } from 'timers/promises';
import HttpApiHelper from "../../../utilities/http-api-helper.mjs";
import {readFile} from "fs/promises";

const requests = JSON.parse(await readFile("test/bdd/steps/api/datasets/requests.json"));
const httpApiHelper = new HttpApiHelper()

When(
    /^I get operation result from node (\d+) for last published assertion/,
    { timeout: 120000 },
    async function resolveCall(node) {
        this.logger.log('I call get result for the last operation');
        expect(
            !!this.state.lastPublishData,
            'Last publish data is undefined. Publish is not finalized.',
        ).to.be.equal(true);

        try {
            const result = await this.state.nodes[node - 1].client
                .getResult(this.state.lastPublishData.UAL)
                .catch((error) => {
                    assert.fail(`Error while trying to resolve assertion. ${error}`);
                });
            const { operationId } = result.operation;

            this.state.lastResolveData = {
                nodeId: node - 1,
                operationId,
                result,
                status: result.operation.status,
                errorType: result.operation.data?.data.errorType,
            };
        } catch (e) {
            this.logger.log(`Error while getting operation result: ${e}`);
        }
    },
);

Given(
    'I wait for last resolve to finalize',
    { timeout: 120000 },
    async function resolveFinalizeCall() {
        this.logger.log('I wait for last resolve to finalize');
        expect(
            !!this.state.lastResolveData,
            'Last resolve data is undefined. Resolve is not started.',
        ).to.be.equal(true);
        const resolveData = this.state.lastResolveData;
        let retryCount = 0;
        const maxRetryCount = 5;
        for (retryCount = 0; retryCount < maxRetryCount; retryCount += 1) {
            this.logger.log(
                `Getting resolve result for operation id: ${resolveData.operationId} on node: ${resolveData.nodeId}`,
            );
            // eslint-disable-next-line no-await-in-loop
            const resolveResult = await httpApiHelper.getOperationResult(
                this.state.nodes[resolveData.nodeId].nodeRpcUrl,
                resolveData.operationId,
            );
            this.logger.log(`Operation status: ${resolveResult.data.status}`);
            if (['COMPLETED', 'FAILED'].includes(resolveResult.data.status)) {
                this.state.lastResolveData.result = resolveResult;
                this.state.lastResolveData.status = resolveResult.data.status;
                this.state.lastResolveData.errorType = resolveResult.data.data?.errorType;
                break;
            }
            if (retryCount === maxRetryCount - 1) {
                assert.fail('Unable to get GET result');
            }
            // eslint-disable-next-line no-await-in-loop
            await setTimeout(4000);
        }
    },
);

Given(/Last resolve returned valid result$/, { timeout: 120000 }, async function resolveCall() {
    this.logger.log('Last resolve returned valid result');
    expect(
        !!this.state.lastResolveData,
        'Last resolve data is undefined. Resolve is not started.',
    ).to.be.equal(true);
    expect(
        !!this.state.lastResolveData.result,
        'Last publish data result is undefined. Publish is not finished.',
    ).to.be.equal(true);
    const resolveData = this.state.lastResolveData;
    expect(
        Array.isArray(resolveData.result.data),
        'Resolve result data expected to be array',
    ).to.be.equal(true);
    // todo only one element in array should be returned
    // expect(resolveData.result.data.length, 'Returned data array length').to.be.equal(1);

    // const resolvedAssertion = resolveData.result.data[0].assertion.data;
    // const publishedAssertion = this.state.lastPublishData.assertion;

    // assert.equal(sortedStringify(publishedAssertion), sortedStringify(resolvedAssertion));
});
Given(
    /^I call get directly to ot-node (\d+) with ([^"]*)/,
    { timeout: 30000 },
    async function getFromNode(node, requestName) {
        this.logger.log(`I call get on ot-node ${node} directly`);
        if (requestName !== 'lastPublishedAssetUAL') {
            expect(
                !!requests[requestName],
                `Request body with name: ${requestName} not found!`,
            ).to.be.equal(true);
        }
        const requestBody =
            requestName !== 'lastPublishedAssetUAL'
                ? requests[requestName]
                : { id: this.state.lastPublishData.UAL };
        const result = await httpApiHelper.get(this.state.nodes[node - 1].nodeRpcUrl, requestBody);
        const { operationId } = result.data;
        this.state.lastResolveData = {
            nodeId: node - 1,
            operationId,
        };
    },
);
