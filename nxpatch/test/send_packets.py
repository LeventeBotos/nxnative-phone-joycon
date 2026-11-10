"""Feeds netpad_mac.m (running on UDP 47611) a scripted session; see netpad_test.sh."""
import socket
import time

s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
send = lambda m: s.sendto(m.encode(), ("127.0.0.1", 47611))
send("P 2 1 0 0 0 0"); time.sleep(0.1)                # player 2 presses A
send("P 3 1024 99999 -99999 5 -5"); time.sleep(0.1)   # player 3: PLUS, sticks clamped to +-32767
send("P 9 1 0 0 0 0"); send("garbage"); send("P 2"); time.sleep(0.1)   # all ignored
send("P 2 0 0 0 0 0"); time.sleep(0.1)                # player 2 releases the button
send("L 2"); time.sleep(0.2)                          # player 2 leaves
time.sleep(3.2)                                       # player 3 goes silent: released by the timeout
