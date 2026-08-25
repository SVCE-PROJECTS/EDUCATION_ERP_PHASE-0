const express      = require('express');
const router       = express.Router();
const authenticate = require('../middleware/authenticate');
const {
  getAchievements, addAchievement, updateAchievement, deleteAchievement,
} = require('../controllers/achievementsController');

router.use(authenticate);

router.get('/',     getAchievements);
router.post('/',    addAchievement);
router.put('/:id',  updateAchievement);
router.delete('/:id', deleteAchievement);

module.exports = router;
