class ParkingCounter:
    def __init__(self, total_slots, available_slots=None):
        self.total_slots = total_slots
        if available_slots is None:
            self.available_slots = total_slots
        else:
            self.available_slots = available_slots

    def increment_count(self, amount=1):
        if self.available_slots < self.total_slots:
            self.available_slots += amount
            if self.available_slots > self.total_slots:
                self.available_slots = self.total_slots

    def decrement_count(self):
        if self.available_slots > 0:
            self.available_slots -= 1

    def get_available_slots(self):
        return self.available_slots

    def __str__(self):
        return f"Available parking slots: {self.available_slots}/{self.total_slots}"
