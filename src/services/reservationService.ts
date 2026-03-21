import { RESERVATION_EXPIRATION_HOURS } from "../utils/constants";
import {
  expireAvailableReservations,
  getNextQueuedReservation,
  markReservationAvailable
} from "../repositories/reservationRepository";

export async function processReservationQueue(bookId: string): Promise<void> {
  await expireAvailableReservations(bookId);

  const next = await getNextQueuedReservation(bookId);
  if (!next) {
    return;
  }

  const expiresAt = new Date(Date.now() + RESERVATION_EXPIRATION_HOURS * 60 * 60 * 1000);
  await markReservationAvailable(next.id, expiresAt);
}
