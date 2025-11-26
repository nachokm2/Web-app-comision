import {
  getRecordsForUser,
  createRecordForUser,
  updateRecordForUser,
  deleteRecordForUser
} from '../services/recordService.js';

export async function listRecords (req, res) {
  const records = await getRecordsForUser(req.user.id);
  res.json({ records });
}

export async function createRecord (req, res) {
  const record = await createRecordForUser(req.user.id, req.body);
  res.status(201).json({ record });
}

export async function updateRecord (req, res) {
  const { recordId } = req.params;
  const record = await updateRecordForUser(req.user.id, recordId, req.body);
  if (!record) {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  res.json({ record });
}

export async function deleteRecord (req, res) {
  const { recordId } = req.params;
  const deleted = await deleteRecordForUser(req.user.id, recordId);
  if (!deleted) {
    return res.status(404).json({ message: 'Registro no encontrado' });
  }
  res.status(204).send();
}
