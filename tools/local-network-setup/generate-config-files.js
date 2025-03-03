/* eslint-disable */
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const numberOfNodes = parseInt(process.argv[2], 10);
const network = process.argv[3];
const hubContractAddress = process.argv[4];

const templatePath = './tools/local-network-setup/.dh_origintrail_noderc';
const bootstrapTemplatePath = './tools/local-network-setup/.bootstrap_origintrail_noderc';

const template = JSON.parse(fs.readFileSync(templatePath));
const bootstrapTemplate = JSON.parse(fs.readFileSync(bootstrapTemplatePath));
const keys = JSON.parse(fs.readFileSync('./tools/local-network-setup/keys.json'));

console.log('Preparing keys for blockchain');

if (!keys) {
    console.log('Missing blockchain keys');
    process.exit(1);
}
bootstrapTemplate.modules.blockchain.defaultImplementation = network;
bootstrapTemplate.modules.blockchain.implementation[network].config.evmOperationalWalletPublicKey =
    keys.publicKey[0];
bootstrapTemplate.modules.blockchain.implementation[network].config.evmOperationalWalletPrivateKey =
    keys.privateKey[0];
bootstrapTemplate.modules.blockchain.implementation[network].config.evmManagementWalletPublicKey =
    keys.publicKey[keys.publicKey.length - 1];
bootstrapTemplate.modules.blockchain.implementation[network].config.hubContractAddress =
    hubContractAddress;
bootstrapTemplate.modules.blockchain.implementation[network].config.rpcEndpoints = [
    process.env.RPC_ENDPOINT,
];

fs.writeFileSync(bootstrapTemplatePath, JSON.stringify(bootstrapTemplate, null, 2));

console.log(`Generating ${numberOfNodes} total nodes`);

for (let i = 0; i < numberOfNodes; i += 1) {
    let nodeName;
    if (i === 0) {
        console.log('Using the preexisting identity for the first node (bootstrap)');
        nodeName = 'bootstrap';
        continue;
    } else {
        nodeName = `DH${i}`;
    }
    console.log(`Configuring node ${nodeName}`);

    const configPath = path.join(`./tools/local-network-setup/.dh${i}_origintrail_noderc`);
    execSync(`touch ${configPath}`);

    const parsedTemplate = JSON.parse(JSON.stringify(template));

    parsedTemplate.modules.blockchain.implementation[network].config.evmOperationalWalletPublicKey =
        keys.publicKey[i + 1];
    parsedTemplate.modules.blockchain.implementation[
        network
    ].config.evmOperationalWalletPrivateKey = keys.privateKey[i + 1];
    parsedTemplate.modules.blockchain.implementation[network].config.evmManagementWalletPublicKey =
        keys.publicKey[keys.publicKey.length - 1];
    parsedTemplate.modules.blockchain.implementation[network].config.hubContractAddress =
        hubContractAddress;
    parsedTemplate.modules.blockchain.implementation[network].config.rpcEndpoints = [
        process.env.RPC_ENDPOINT,
    ];

    parsedTemplate.modules.httpClient.implementation['express-http-client'].config.port = 8900 + i;
    parsedTemplate.modules.network.implementation['libp2p-service'].config.port = 9000 + i;
    parsedTemplate.modules.repository.implementation[
        'sequelize-repository'
    ].config.database = `operationaldb${i}`;
    parsedTemplate.modules.tripleStore.implementation[
        'ot-graphdb'
    ].config.repository = `repository${i}`;
    parsedTemplate.appDataPath = `data${i}`;

    if (process.env.LOG_LEVEL) {
        parsedTemplate.logLevel = process.env.LOG_LEVEL;
    }

    fs.writeFileSync(`${configPath}`, JSON.stringify(parsedTemplate, null, 2));
}
