import { Router } from 'express';
import { CallController } from '../controllers/CallController';
import { validateCallInitiate } from '../middleware/validation';

const router = Router();
const callController = new CallController();

// Call routes
router.post('/initiate', validateCallInitiate, callController.initiateCall.bind(callController));
router.post('/:callId/end', callController.endCall.bind(callController));
router.get('/:callId/status', callController.getCallStatus.bind(callController));
router.get('/', callController.getAllCalls.bind(callController));
router.delete('/', callController.clearAllCalls.bind(callController));

export default router;
