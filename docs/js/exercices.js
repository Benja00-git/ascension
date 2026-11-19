/* Ascension — bibliothèque d'exercices de la Forge (renforcement, musculation, gainage, mobilité, étirements).
 *
 * mat    : matériel requis — corps (rien), elastique, halteres, chaise (chaise romaine : dips, relevés, barre de traction),
 *          salle (barre, machines, poulies, bancs).
 * motif  : la « case » qu'il remplit dans une séance (voir MODELES dans forge.js).
 * mode   : reps (répétitions) ou temps (secondes).
 * charge : on note un poids (kg) pour cet exercice.
 * uni    : se fait d'un côté puis de l'autre.
 * base   : mouvement polyarticulaire (séries plus lourdes en force).
 */

export const MATERIELS = [
  { id: 'elastique', nom: 'Élastiques', emoji: '🪢' },
  { id: 'halteres', nom: 'Haltères', emoji: '🏋️' },
  { id: 'chaise', nom: 'Chaise romaine', emoji: '🪑' },
  { id: 'salle', nom: 'Salle de musculation', emoji: '🏟️' },
];

export const EXERCICES = [
  /* ── Jambes : squat ── */
  { id: 'squat-pdc', nom: 'Squat au poids du corps', zone: 'Cuisses', motif: 'squat', mat: 'corps', mode: 'reps', base: true, consigne: 'Pieds largeur d’épaules, descends hanches en arrière jusqu’à la parallèle, dos droit, genoux dans l’axe des pieds.' },
  { id: 'squat-saute', nom: 'Squat sauté', zone: 'Cuisses', motif: 'squat', mat: 'corps', mode: 'reps', explosif: true, consigne: 'Squat contrôlé puis saut explosif ; réception souple, genoux fléchis.' },
  { id: 'squat-elastique', nom: 'Squat avec élastique', zone: 'Cuisses', motif: 'squat', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique sous les pieds, poignées aux épaules ; pousse le sol en remontant.' },
  { id: 'goblet-squat', nom: 'Goblet squat', zone: 'Cuisses', motif: 'squat', mat: 'halteres', mode: 'reps', charge: true, base: true, consigne: 'Haltère tenu contre la poitrine, coudes entre les genoux en bas, buste haut.' },
  { id: 'squat-barre', nom: 'Squat à la barre', zone: 'Cuisses', motif: 'squat', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Barre sur les trapèzes, gainage fort, descends sous contrôle et remonte en poussant le sol.' },
  { id: 'presse', nom: 'Presse à cuisses', zone: 'Cuisses', motif: 'squat', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Bas du dos collé au dossier, descends jusqu’à 90° sans décoller le bassin, ne verrouille pas les genoux.' },

  /* ── Jambes : charnière de hanche ── */
  { id: 'pont-fessier', nom: 'Pont fessier', zone: 'Fessiers', motif: 'charniere', mat: 'corps', mode: 'reps', consigne: 'Allongé, pieds à plat ; monte le bassin en serrant les fessiers, pause d’une seconde en haut.' },
  { id: 'sdt-roumain-elastique', nom: 'Soulevé de terre roumain à l’élastique', zone: 'Ischios', motif: 'charniere', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique sous les pieds ; pousse les hanches en arrière, dos plat, jambes presque tendues.' },
  { id: 'sdt-roumain-halteres', nom: 'Soulevé de terre roumain aux haltères', zone: 'Ischios', motif: 'charniere', mat: 'halteres', mode: 'reps', charge: true, base: true, consigne: 'Haltères le long des cuisses ; hanches en arrière, dos plat, descends jusqu’à l’étirement des ischios.' },
  { id: 'hip-thrust-haltere', nom: 'Hip thrust avec haltère', zone: 'Fessiers', motif: 'charniere', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Dos appuyé sur un canapé ou un banc, haltère sur les hanches ; monte jusqu’à l’alignement épaules-genoux.' },
  { id: 'sdt-roumain-barre', nom: 'Soulevé de terre roumain à la barre', zone: 'Ischios', motif: 'charniere', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Barre près des jambes, dos plat ; descends en poussant les hanches en arrière jusqu’à mi-tibia.' },
  { id: 'hip-thrust-barre', nom: 'Hip thrust à la barre', zone: 'Fessiers', motif: 'charniere', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Haut du dos sur le banc, barre sur les hanches (protégée) ; menton rentré, serre les fessiers en haut.' },

  /* ── Jambes : unilatéral ── */
  { id: 'fente-arriere', nom: 'Fentes arrière', zone: 'Cuisses', motif: 'fente', mat: 'corps', mode: 'reps', uni: true, consigne: 'Grand pas en arrière, genou arrière proche du sol, buste droit ; pousse sur le talon avant.' },
  { id: 'split-squat', nom: 'Split squat', zone: 'Cuisses', motif: 'fente', mat: 'corps', mode: 'reps', uni: true, consigne: 'Position de fente fixe ; descends à la verticale, genou avant au-dessus de la cheville.' },
  { id: 'fente-halteres', nom: 'Fentes marchées aux haltères', zone: 'Cuisses', motif: 'fente', mat: 'halteres', mode: 'reps', charge: true, uni: true, consigne: 'Un haltère dans chaque main, pas longs et contrôlés, buste droit.' },
  { id: 'bulgare-halteres', nom: 'Squat bulgare aux haltères', zone: 'Cuisses', motif: 'fente', mat: 'halteres', mode: 'reps', charge: true, uni: true, consigne: 'Pied arrière posé sur une chaise ; descends droit, poids sur la jambe avant.' },
  { id: 'fente-elastique', nom: 'Fentes avant avec élastique', zone: 'Cuisses', motif: 'fente', mat: 'elastique', mode: 'reps', uni: true, consigne: 'Élastique sous le pied avant, poignées aux épaules ; descends puis repousse.' },

  /* ── Jambes : isolation ── */
  { id: 'pont-une-jambe', nom: 'Pont fessier sur une jambe', zone: 'Ischios', motif: 'ischio', mat: 'corps', mode: 'reps', uni: true, consigne: 'Une jambe tendue en l’air, pousse sur le talon au sol, bassin bien horizontal.' },
  { id: 'leg-curl-elastique', nom: 'Leg curl à l’élastique', zone: 'Ischios', motif: 'ischio', mat: 'elastique', mode: 'reps', consigne: 'À plat ventre, élastique attaché bas autour des chevilles ; ramène les talons vers les fesses.' },
  { id: 'leg-curl', nom: 'Leg curl à la machine', zone: 'Ischios', motif: 'ischio', mat: 'salle', mode: 'reps', charge: true, consigne: 'Bassin plaqué, flexion complète puis retour lent (3 secondes).' },
  { id: 'chaise-murale', nom: 'Chaise contre le mur', zone: 'Cuisses', motif: 'quad', mat: 'corps', mode: 'temps', consigne: 'Dos au mur, cuisses parallèles au sol, genoux à 90°.' },
  { id: 'leg-extension', nom: 'Leg extension', zone: 'Cuisses', motif: 'quad', mat: 'salle', mode: 'reps', charge: true, consigne: 'Tends les jambes complètement, pause d’une seconde, redescends lentement.' },
  { id: 'marche-laterale', nom: 'Marche latérale à l’élastique', zone: 'Fessiers', motif: 'fessier', mat: 'elastique', mode: 'reps', consigne: 'Mini-bande au-dessus des genoux, demi-squat ; pas latéraux sans relâcher la tension.' },
  { id: 'abducteurs', nom: 'Abducteurs à la machine', zone: 'Fessiers', motif: 'fessier', mat: 'salle', mode: 'reps', charge: true, consigne: 'Écarte les cuisses en contrôlant, buste légèrement penché en avant.' },
  { id: 'clamshell', nom: 'Clamshell', zone: 'Fessiers', motif: 'fessier', mat: 'corps', mode: 'reps', uni: true, consigne: 'Sur le côté, genoux fléchis ; ouvre le genou du dessus sans basculer le bassin.' },
  { id: 'mollets-pdc', nom: 'Mollets debout', zone: 'Mollets', motif: 'mollet', mat: 'corps', mode: 'reps', consigne: 'Sur une marche, talons dans le vide ; monte haut, descends sous la marche.' },
  { id: 'mollets-halteres', nom: 'Mollets debout aux haltères', zone: 'Mollets', motif: 'mollet', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Haltères en mains, amplitude complète, pause en haut.' },
  { id: 'mollets-machine', nom: 'Mollets à la machine', zone: 'Mollets', motif: 'mollet', mat: 'salle', mode: 'reps', charge: true, consigne: 'Amplitude complète, étirement en bas, contraction d’une seconde en haut.' },

  /* ── Haut du corps : poussée horizontale ── */
  { id: 'pompes', nom: 'Pompes', zone: 'Pectoraux', motif: 'pousser_h', mat: 'corps', mode: 'reps', base: true, consigne: 'Corps gainé de la tête aux talons, coudes à 45°, poitrine près du sol.' },
  { id: 'pompes-declinees', nom: 'Pompes pieds surélevés', zone: 'Pectoraux', motif: 'pousser_h', mat: 'corps', mode: 'reps', base: true, consigne: 'Pieds sur une chaise, gainage fort ; plus difficile que les pompes classiques.' },
  { id: 'presse-pecto-elastique', nom: 'Développé debout à l’élastique', zone: 'Pectoraux', motif: 'pousser_h', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique ancré dans le dos à hauteur de poitrine ; pousse devant toi, un pied en avant.' },
  { id: 'developpe-sol', nom: 'Développé au sol aux haltères', zone: 'Pectoraux', motif: 'pousser_h', mat: 'halteres', mode: 'reps', charge: true, base: true, consigne: 'Allongé au sol, coudes qui touchent le sol en bas ; pousse les haltères au-dessus de la poitrine.' },
  { id: 'developpe-couche', nom: 'Développé couché à la barre', zone: 'Pectoraux', motif: 'pousser_h', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Omoplates serrées, pieds au sol ; barre au bas des pectoraux, pousse sans décoller les fesses.' },
  { id: 'developpe-incline', nom: 'Développé incliné aux haltères', zone: 'Pectoraux', motif: 'pousser_h', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Banc à 30°, haltères qui descendent au niveau du haut des pectoraux.' },
  { id: 'ecarte-poulie', nom: 'Écarté à la poulie', zone: 'Pectoraux', motif: 'pecto_iso', mat: 'salle', mode: 'reps', charge: true, consigne: 'Bras légèrement fléchis, ramène les mains devant la poitrine en arc de cercle.' },
  { id: 'ecarte-halteres', nom: 'Écarté couché aux haltères', zone: 'Pectoraux', motif: 'pecto_iso', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Au sol ou sur un banc ; ouvre les bras fléchis jusqu’à l’étirement, referme en serrant.' },
  { id: 'dips-chaise-romaine', nom: 'Dips à la chaise romaine', zone: 'Pectoraux', motif: 'dips', mat: 'chaise', mode: 'reps', base: true, consigne: 'Buste légèrement penché, descends jusqu’à 90° aux coudes, remonte sans balancer.' },
  { id: 'dips-chaise', nom: 'Dips sur une chaise', zone: 'Triceps', motif: 'dips', mat: 'corps', mode: 'reps', consigne: 'Mains sur le bord d’une chaise stable, dos près du siège ; descends coudes vers l’arrière.' },

  /* ── Haut du corps : poussée verticale ── */
  { id: 'pompes-piquees', nom: 'Pompes piquées', zone: 'Épaules', motif: 'pousser_v', mat: 'corps', mode: 'reps', base: true, consigne: 'Bassin haut (V inversé), descends la tête vers le sol entre les mains.' },
  { id: 'developpe-elastique', nom: 'Développé militaire à l’élastique', zone: 'Épaules', motif: 'pousser_v', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique sous les pieds, pousse au-dessus de la tête, fessiers et abdos serrés.' },
  { id: 'developpe-epaules-halteres', nom: 'Développé épaules aux haltères', zone: 'Épaules', motif: 'pousser_v', mat: 'halteres', mode: 'reps', charge: true, base: true, consigne: 'Assis ou debout, haltères à hauteur d’oreilles ; pousse sans cambrer.' },
  { id: 'developpe-militaire', nom: 'Développé militaire à la barre', zone: 'Épaules', motif: 'pousser_v', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Debout, gainage fort ; la barre passe devant le visage et finit au-dessus de la tête.' },

  /* ── Haut du corps : tirage horizontal ── */
  { id: 'rowing-elastique', nom: 'Rowing assis à l’élastique', zone: 'Dos', motif: 'tirer_h', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique autour des pieds, tire vers le nombril en serrant les omoplates.' },
  { id: 'rowing-haltere', nom: 'Rowing haltère un bras', zone: 'Dos', motif: 'tirer_h', mat: 'halteres', mode: 'reps', charge: true, uni: true, base: true, consigne: 'Main et genou en appui, dos plat ; tire le coude vers la hanche.' },
  { id: 'rowing-penche-halteres', nom: 'Rowing buste penché aux haltères', zone: 'Dos', motif: 'tirer_h', mat: 'halteres', mode: 'reps', charge: true, base: true, consigne: 'Buste à 45°, dos plat ; tire les deux haltères vers le bas des côtes.' },
  { id: 'tirage-horizontal', nom: 'Tirage horizontal à la poulie', zone: 'Dos', motif: 'tirer_h', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Buste droit, tire la poignée vers le ventre, omoplates serrées, retour lent.' },
  { id: 'rowing-barre', nom: 'Rowing barre', zone: 'Dos', motif: 'tirer_h', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Buste penché, dos plat ; barre tirée vers le nombril.' },
  { id: 'rowing-inverse', nom: 'Rowing inversé sous une table', zone: 'Dos', motif: 'tirer_h', mat: 'corps', mode: 'reps', base: true, consigne: 'Allongé sous une table solide, mains au bord ; tire la poitrine vers la table, corps gainé.' },

  /* ── Haut du corps : tirage vertical ── */
  { id: 'tractions-chaise', nom: 'Tractions (barre de la chaise romaine)', zone: 'Dos', motif: 'tirer_v', mat: 'chaise', mode: 'reps', base: true, consigne: 'Prise pronation un peu plus large que les épaules ; menton au-dessus de la barre, descente complète.' },
  { id: 'tirage-vertical-elastique', nom: 'Tirage vertical à l’élastique', zone: 'Dos', motif: 'tirer_v', mat: 'elastique', mode: 'reps', base: true, consigne: 'Élastique ancré en haut d’une porte ; tire les coudes vers les côtes, poitrine sortie.' },
  { id: 'pullover-haltere', nom: 'Pull-over à l’haltère', zone: 'Dos', motif: 'tirer_v', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Allongé, haltère tenu à deux mains au-dessus de la poitrine ; descends derrière la tête bras fléchis.' },
  { id: 'tirage-vertical', nom: 'Tirage vertical à la poulie', zone: 'Dos', motif: 'tirer_v', mat: 'salle', mode: 'reps', charge: true, base: true, consigne: 'Tire la barre vers le haut de la poitrine, coudes vers le bas, sans balancer le buste.' },
  { id: 'tractions-salle', nom: 'Tractions', zone: 'Dos', motif: 'tirer_v', mat: 'salle', mode: 'reps', base: true, consigne: 'Menton au-dessus de la barre, descente contrôlée bras tendus. Lest possible (note les kg).', charge: true },

  /* ── Épaules, bras ── */
  { id: 'elevations-elastique', nom: 'Élévations latérales à l’élastique', zone: 'Épaules', motif: 'epaules', mat: 'elastique', mode: 'reps', consigne: 'Bras presque tendus, monte jusqu’à l’horizontale, coudes légèrement fléchis.' },
  { id: 'elevations-halteres', nom: 'Élévations latérales aux haltères', zone: 'Épaules', motif: 'epaules', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Monte jusqu’à l’horizontale sans hausser les épaules, descente lente.' },
  { id: 'elevations-poulie', nom: 'Élévations latérales à la poulie', zone: 'Épaules', motif: 'epaules', mat: 'salle', mode: 'reps', charge: true, uni: true, consigne: 'Poulie basse, câble devant le corps ; monte à l’horizontale.' },
  { id: 'pull-apart', nom: 'Écartés arrière à l’élastique', zone: 'Épaules', motif: 'posture', mat: 'elastique', mode: 'reps', consigne: 'Bras tendus devant toi, écarte l’élastique jusqu’à la poitrine en serrant les omoplates.' },
  { id: 'oiseau-halteres', nom: 'Oiseau aux haltères', zone: 'Épaules', motif: 'posture', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Buste penché, ouvre les bras sur les côtés, coudes légèrement fléchis.' },
  { id: 'face-pull', nom: 'Face pull à la poulie', zone: 'Épaules', motif: 'posture', mat: 'salle', mode: 'reps', charge: true, consigne: 'Corde à hauteur du visage ; tire vers le front en écartant les mains.' },
  { id: 'y-t-w', nom: 'Y-T-W allongé', zone: 'Épaules', motif: 'posture', mat: 'corps', mode: 'reps', consigne: 'À plat ventre, dessine Y, T puis W avec les bras en serrant les omoplates.' },
  { id: 'curl-elastique', nom: 'Curl à l’élastique', zone: 'Biceps', motif: 'biceps', mat: 'elastique', mode: 'reps', consigne: 'Coudes collés au corps, monte en supination, descente lente.' },
  { id: 'curl-halteres', nom: 'Curl aux haltères', zone: 'Biceps', motif: 'biceps', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Coudes fixes, rotation des poignets en montant, sans balancer.' },
  { id: 'curl-marteau', nom: 'Curl marteau', zone: 'Biceps', motif: 'biceps', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Prise neutre (pouces vers le haut), coudes fixes.' },
  { id: 'curl-poulie', nom: 'Curl à la poulie', zone: 'Biceps', motif: 'biceps', mat: 'salle', mode: 'reps', charge: true, consigne: 'Poulie basse, coudes collés, contraction en haut.' },
  { id: 'extension-elastique', nom: 'Extension triceps à l’élastique', zone: 'Triceps', motif: 'triceps', mat: 'elastique', mode: 'reps', consigne: 'Élastique ancré en haut ; tends les bras vers le bas, coudes fixes.' },
  { id: 'extension-haltere', nom: 'Extension triceps au-dessus de la tête', zone: 'Triceps', motif: 'triceps', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Haltère tenu à deux mains derrière la tête ; tends les bras, coudes serrés.' },
  { id: 'extension-poulie', nom: 'Extension triceps à la poulie', zone: 'Triceps', motif: 'triceps', mat: 'salle', mode: 'reps', charge: true, consigne: 'Coudes collés au corps, tends complètement, retour contrôlé.' },
  { id: 'pompes-diamant', nom: 'Pompes diamant', zone: 'Triceps', motif: 'triceps', mat: 'corps', mode: 'reps', consigne: 'Mains jointes sous la poitrine (pouces et index en losange), coudes près du corps.' },

  /* ── Gainage et dos ── */
  { id: 'planche', nom: 'Planche', zone: 'Abdos', motif: 'gainage', mat: 'corps', mode: 'temps', consigne: 'Sur les avant-bras, corps aligné, fessiers et abdos serrés, ne creuse pas le dos.' },
  { id: 'dead-bug', nom: 'Dead bug', zone: 'Abdos', motif: 'gainage', mat: 'corps', mode: 'reps', consigne: 'Sur le dos, bas du dos plaqué ; tends bras et jambe opposés lentement.' },
  { id: 'hollow', nom: 'Hollow hold', zone: 'Abdos', motif: 'gainage', mat: 'corps', mode: 'temps', consigne: 'Sur le dos, épaules et jambes décollées, bas du dos collé au sol.' },
  { id: 'releves-genoux', nom: 'Relevés de genoux à la chaise romaine', zone: 'Abdos', motif: 'gainage', mat: 'chaise', mode: 'reps', consigne: 'Dos contre le dossier, monte les genoux vers la poitrine en enroulant le bassin, sans élan.' },
  { id: 'releves-jambes', nom: 'Relevés de jambes tendues à la chaise romaine', zone: 'Abdos', motif: 'gainage', mat: 'chaise', mode: 'reps', consigne: 'Jambes tendues jusqu’à l’horizontale, descente lente.' },
  { id: 'crunch-poulie', nom: 'Crunch à la poulie', zone: 'Abdos', motif: 'gainage', mat: 'salle', mode: 'reps', charge: true, consigne: 'À genoux, corde derrière la tête ; enroule le buste vers les cuisses.' },
  { id: 'planche-laterale', nom: 'Planche latérale', zone: 'Obliques', motif: 'gainage_lat', mat: 'corps', mode: 'temps', uni: true, consigne: 'Sur un avant-bras, corps aligné, bassin haut.' },
  { id: 'pallof', nom: 'Pallof press', zone: 'Obliques', motif: 'gainage_lat', mat: 'elastique', mode: 'reps', uni: true, consigne: 'Élastique ancré sur le côté à hauteur de poitrine ; pousse devant toi sans laisser le buste tourner.' },
  { id: 'russian-twist', nom: 'Russian twist', zone: 'Obliques', motif: 'rotation', mat: 'halteres', mode: 'reps', charge: true, consigne: 'Assis, pieds décollés ou posés, tourne l’haltère d’un côté à l’autre.' },
  { id: 'woodchop-elastique', nom: 'Bûcheron à l’élastique', zone: 'Obliques', motif: 'rotation', mat: 'elastique', mode: 'reps', uni: true, consigne: 'Élastique ancré en haut ; tire en diagonale vers la hanche opposée en pivotant.' },
  { id: 'woodchop-poulie', nom: 'Bûcheron à la poulie', zone: 'Obliques', motif: 'rotation', mat: 'salle', mode: 'reps', charge: true, uni: true, consigne: 'Diagonale de haut en bas, bras tendus, rotation du buste.' },
  { id: 'bird-dog', nom: 'Bird dog', zone: 'Lombaires', motif: 'lombaires', mat: 'corps', mode: 'reps', uni: true, consigne: 'À quatre pattes, tends bras et jambe opposés, dos plat, pause de 2 secondes.' },
  { id: 'superman', nom: 'Superman', zone: 'Lombaires', motif: 'lombaires', mat: 'corps', mode: 'reps', consigne: 'À plat ventre, décolle bras et jambes, regard vers le sol.' },
  { id: 'extension-lombaires', nom: 'Extensions lombaires au banc', zone: 'Lombaires', motif: 'lombaires', mat: 'salle', mode: 'reps', consigne: 'Bassin calé, descends le buste puis remonte jusqu’à l’alignement, sans hyper-cambrer.' },
  { id: 'suspension', nom: 'Suspension à la barre', zone: 'Dos', motif: 'decompression', mat: 'chaise', mode: 'temps', consigne: 'Suspendu bras tendus, épaules actives ; respire et relâche le bas du dos.' },

  /* ── Échauffement et mobilité ── */
  { id: 'cercles-bras', nom: 'Cercles de bras', zone: 'Épaules', motif: 'echauffement', mat: 'corps', mode: 'temps', consigne: 'Petits puis grands cercles, dans les deux sens.' },
  { id: 'rotation-hanches', nom: 'Rotations de hanches', zone: 'Hanches', motif: 'echauffement', mat: 'corps', mode: 'temps', consigne: 'Mains sur les hanches, grands cercles dans les deux sens.' },
  { id: 'chat-vache', nom: 'Chat-vache', zone: 'Dos', motif: 'echauffement', mat: 'corps', mode: 'temps', consigne: 'À quatre pattes, enroule puis creuse le dos lentement, avec la respiration.' },
  { id: 'greatest-stretch', nom: 'Fente avec rotation du buste', zone: 'Hanches', motif: 'echauffement', mat: 'corps', mode: 'temps', uni: true, consigne: 'Fente avant, main au sol, ouvre l’autre bras vers le plafond.' },
  { id: 'balancier-jambes', nom: 'Balanciers de jambes', zone: 'Hanches', motif: 'echauffement', mat: 'corps', mode: 'temps', uni: true, consigne: 'Appui contre un mur, balance la jambe d’avant en arrière, amplitude progressive.' },
  { id: 'squat-tenu', nom: 'Squat profond tenu', zone: 'Hanches', motif: 'echauffement', mat: 'corps', mode: 'temps', consigne: 'Descends au plus bas talons au sol, coudes qui écartent les genoux.' },
  { id: 'dislocations', nom: 'Passages d’épaules à l’élastique', zone: 'Épaules', motif: 'echauffement', mat: 'elastique', mode: 'temps', consigne: 'Élastique tenu large, bras tendus ; passe de l’avant à l’arrière de la tête.' },

  /* ── Étirements (secondes par côté si « uni ») ── */
  { id: 'et-ischios', nom: 'Étirement des ischios debout', zone: 'Ischios', motif: 'etirement', etire: 'ischios', mat: 'corps', mode: 'temps', uni: true, consigne: 'Talon sur un support bas, jambe tendue ; penche le buste dos droit.' },
  { id: 'et-ischios-elastique', nom: 'Étirement des ischios à l’élastique', zone: 'Ischios', motif: 'etirement', etire: 'ischios', mat: 'elastique', mode: 'temps', uni: true, consigne: 'Allongé, élastique sous le pied ; monte la jambe tendue jusqu’à l’étirement.' },
  { id: 'et-quadriceps', nom: 'Étirement du quadriceps debout', zone: 'Cuisses', motif: 'etirement', etire: 'quadriceps', mat: 'corps', mode: 'temps', uni: true, consigne: 'Talon vers la fesse, genoux serrés, bassin rentré.' },
  { id: 'et-psoas', nom: 'Fente basse (fléchisseurs de hanche)', zone: 'Hanches', motif: 'etirement', etire: 'hanches', mat: 'corps', mode: 'temps', uni: true, consigne: 'Genou arrière au sol, avance le bassin en serrant le fessier arrière.' },
  { id: 'et-pigeon', nom: 'Pigeon', zone: 'Fessiers', motif: 'etirement', etire: 'fessiers', mat: 'corps', mode: 'temps', uni: true, consigne: 'Jambe avant pliée devant toi, jambe arrière tendue ; penche le buste vers l’avant.' },
  { id: 'et-figure4', nom: 'Étirement en 4 allongé', zone: 'Fessiers', motif: 'etirement', etire: 'fessiers', mat: 'corps', mode: 'temps', uni: true, consigne: 'Sur le dos, cheville sur le genou opposé ; ramène la cuisse vers toi.' },
  { id: 'et-papillon', nom: 'Papillon', zone: 'Adducteurs', motif: 'etirement', etire: 'adducteurs', mat: 'corps', mode: 'temps', consigne: 'Assis, plantes de pieds jointes ; laisse descendre les genoux, dos droit.' },
  { id: 'et-mollets', nom: 'Étirement des mollets au mur', zone: 'Mollets', motif: 'etirement', etire: 'mollets', mat: 'corps', mode: 'temps', uni: true, consigne: 'Mains au mur, jambe arrière tendue, talon au sol.' },
  { id: 'et-pectoraux', nom: 'Étirement des pectoraux à la porte', zone: 'Pectoraux', motif: 'etirement', etire: 'pectoraux', mat: 'corps', mode: 'temps', uni: true, consigne: 'Avant-bras sur le chambranle, coude à hauteur d’épaule ; avance doucement le buste.' },
  { id: 'et-epaule', nom: 'Étirement de l’épaule bras croisé', zone: 'Épaules', motif: 'etirement', etire: 'epaules', mat: 'corps', mode: 'temps', uni: true, consigne: 'Ramène le bras tendu contre la poitrine avec l’autre main.' },
  { id: 'et-triceps', nom: 'Étirement du triceps', zone: 'Triceps', motif: 'etirement', etire: 'epaules', mat: 'corps', mode: 'temps', uni: true, consigne: 'Main dans le dos derrière la tête, l’autre main pousse doucement le coude.' },
  { id: 'et-enfant', nom: 'Posture de l’enfant', zone: 'Dos', motif: 'etirement', etire: 'dos', mat: 'corps', mode: 'temps', consigne: 'Assis sur les talons, bras allongés devant, front au sol ; respire dans le dos.' },
  { id: 'et-torsion', nom: 'Torsion allongée', zone: 'Dos', motif: 'etirement', etire: 'dos', mat: 'corps', mode: 'temps', uni: true, consigne: 'Sur le dos, genou plié qui passe de l’autre côté, épaules au sol.' },
  { id: 'et-open-book', nom: 'Ouverture thoracique sur le côté', zone: 'Dos', motif: 'etirement', etire: 'thoracique', mat: 'corps', mode: 'temps', uni: true, consigne: 'Sur le côté, genoux pliés ; ouvre le bras du dessus vers l’arrière en suivant la main du regard.' },
  { id: 'et-genoux-poitrine', nom: 'Genoux à la poitrine', zone: 'Lombaires', motif: 'etirement', etire: 'lombaires', mat: 'corps', mode: 'temps', consigne: 'Sur le dos, serre les genoux contre la poitrine, bas du dos relâché.' },
  { id: 'et-cou', nom: 'Inclinaison latérale du cou', zone: 'Cou', motif: 'etirement', etire: 'cou', mat: 'corps', mode: 'temps', uni: true, consigne: 'Oreille vers l’épaule, épaule opposée relâchée vers le bas, sans forcer.' },
  { id: 'et-suspension', nom: 'Suspension passive', zone: 'Dos', motif: 'etirement', etire: 'thoracique', mat: 'chaise', mode: 'temps', consigne: 'Suspendu à la barre, épaules relâchées, laisse le corps s’allonger.' },
];

export const PAR_ID = new Map(EXERCICES.map(e => [e.id, e]));
