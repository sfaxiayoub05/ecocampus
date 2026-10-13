# Makefile : compile les 4 fichiers .c ensemble (equivalent de la commande gcc du README)
CC     = gcc
CFLAGS = -std=c99 -Wall -Wextra -g
SRC    = main.c gestion.c analyse.c export.c

ecocompus: $(SRC) gestion.h
	$(CC) $(CFLAGS) -o $@ $(SRC)

run: ecocompus
	./ecocompus ../data/measures_test.csv

test: ecocompus
	sh tests.sh

clean:
	rm -f ecocompus

.PHONY: run test clean
