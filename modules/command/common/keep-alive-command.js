const { v1: uuidv1 } = require('uuid');
const Command = require('../command');
const pjson = require("../../../package.json");
const PeerId = require("peer-id");

class KeepAliveCommand extends Command {
    constructor(ctx) {
        super(ctx);
        this.logger = ctx.logger;
        this.config = ctx.config;
    }

    /**
     * Executes command and produces one or more events
     * @param command
     */
    async execute(command) {
        const { message } = command.data;

        const Id_operation = uuidv1();
        this.logger.emit({
            msg: message, Event_name: 'keep_alive', Operation_name: 'KeepAlive', Id_operation,
        });

        const signalingMessage = {
            nodeVersion: pjson.version,
            autoUpdate: this.config.autoUpdate.enabled,
            telemetry: {
                enabled: this.config.telemetryHub.enabled,
            },
            proof: {}
        };
        try{
            const peerId = await PeerId.createFromPrivKey(this.config.network.privateKey);
            signalingMessage.issuerWallet = this.config.blockchain[0].publicKey;
            signalingMessage.kademliaNodeId = peerId;
            signalingMessage.nodeVersion = pjson.version;
            signalingMessage.telemetry.latestAssertions = [];
        } catch (e) {
            this.logger.error(`An error has occurred with signaling data. ${e.message}`)
        }

        signalingMessage.proof.hash = this.validationService.calculateHash(signalingMessage);
        signalingMessage.proof.signature = this.validationService.sign(signalingMessage.proof.hash);

        //TODO send data

        return Command.repeat();
    }

    /**
     * Builds default dcConvertToOtJsonCommand
     * @param map
     * @returns {{add, data: *, delay: *, deadline: *}}
     */
    default(map) {
        const command = {
            name: 'keepAliveCommand',
            delay: 0,
            data: {
                message: 'OT-Node is alive...',
            },
            period: 15 * 60 * 1000,
            transactional: false,
        };
        Object.assign(command, map);
        return command;
    }
}

module.exports = KeepAliveCommand;
