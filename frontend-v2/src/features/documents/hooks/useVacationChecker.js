import React, { useState } from 'react';
import VacationStatusChecker from '../components/vacation/VacationStatusChecker';

/**
 * Hook to easily check vacation status before assigning a user
 *
 * Usage:
 * ```
 * const { checkUserVacation, VacationDialog } = useVacationChecker();
 *
 * // When user selects a person to assign:
 * checkUserVacation(userId, userName, (result) => {
 *   // result: { userId, userName, vacationStatus, hasWarning }
 *   proceedWithAssignment(result);
 * });
 *
 * // Render the dialog:
 * return <>{VacationDialog}</>;
 * ```
 */
export const useVacationChecker = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [onConfirmCallback, setOnConfirmCallback] = useState(null);

  const checkUserVacation = (userId, userName, onConfirm) => {
    setCurrentUser({ userId, userName });
    setOnConfirmCallback(() => onConfirm);
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
    setCurrentUser(null);
    setOnConfirmCallback(null);
  };

  const VacationDialog = currentUser ? (
    <VacationStatusChecker
      open={isOpen}
      onClose={handleClose}
      onConfirm={onConfirmCallback}
      userId={currentUser.userId}
      userName={currentUser.userName}
    />
  ) : null;

  return {
    checkUserVacation,
    VacationDialog,
  };
};
