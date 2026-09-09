-- CreateTable
CREATE TABLE "Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "scheduledAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "queueId" TEXT NOT NULL,
    "ticketId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedInAt" DATETIME,
    CONSTRAINT "Appointment_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "Queue" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AppointmentReminder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "appointmentId" TEXT NOT NULL,
    "minutesBefore" INTEGER NOT NULL,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AppointmentReminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Appointment_ticketId_key" ON "Appointment"("ticketId");

-- CreateIndex
CREATE INDEX "Appointment_status_scheduledAt_idx" ON "Appointment"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "AppointmentReminder_appointmentId_minutesBefore_key" ON "AppointmentReminder"("appointmentId", "minutesBefore");
