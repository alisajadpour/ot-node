import { createRequire } from 'module';
import BaseController from './base-controller.js';

const require = createRequire(import.meta.url);
const { version } = require('../../../package.json');

class InfoController extends BaseController {
    handleHttpApiInfoRequest(req, res) {
        this.returnResponse(res, 200, {
            version,
        });
    }
}

export default InfoController;
