export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      allergen: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      angebotsform: {
        Row: {
          code: string
          name: string
          reihenfolge: number
        }
        Insert: {
          code: string
          name: string
          reihenfolge: number
        }
        Update: {
          code?: string
          name?: string
          reihenfolge?: number
        }
        Relationships: []
      }
      anlass: {
        Row: {
          angebotsform: string | null
          bemerkung: string | null
          betrieb: string | null
          datum: string | null
          datum_bis: string | null
          gaeste: number | null
          id: string
          kunde: string | null
          name: string
          nummer: string | null
          ort: string | null
          saison_id: string | null
          serviceart: string | null
          status: string
          umsatz_netto_chf: number | null
          vorlauf_tage: number
        }
        Insert: {
          angebotsform?: string | null
          bemerkung?: string | null
          betrieb?: string | null
          datum?: string | null
          datum_bis?: string | null
          gaeste?: number | null
          id?: string
          kunde?: string | null
          name: string
          nummer?: string | null
          ort?: string | null
          saison_id?: string | null
          serviceart?: string | null
          status?: string
          umsatz_netto_chf?: number | null
          vorlauf_tage?: number
        }
        Update: {
          angebotsform?: string | null
          bemerkung?: string | null
          betrieb?: string | null
          datum?: string | null
          datum_bis?: string | null
          gaeste?: number | null
          id?: string
          kunde?: string | null
          name?: string
          nummer?: string | null
          ort?: string | null
          saison_id?: string | null
          serviceart?: string | null
          status?: string
          umsatz_netto_chf?: number | null
          vorlauf_tage?: number
        }
        Relationships: [
          {
            foreignKeyName: "anlass_angebotsform_fkey"
            columns: ["angebotsform"]
            isOneToOne: false
            referencedRelation: "angebotsform"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "anlass_betrieb_fkey"
            columns: ["betrieb"]
            isOneToOne: false
            referencedRelation: "betrieb"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
        ]
      }
      anlass_geraet: {
        Row: {
          anlass_id: string
          anzahl: number
          bemerkung: string | null
          geraet_id: string
          id: string
        }
        Insert: {
          anlass_id: string
          anzahl: number
          bemerkung?: string | null
          geraet_id: string
          id?: string
        }
        Update: {
          anlass_id?: string
          anzahl?: number
          bemerkung?: string | null
          geraet_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_geraet_id_fkey"
            columns: ["geraet_id"]
            isOneToOne: false
            referencedRelation: "geraet"
            referencedColumns: ["id"]
          },
        ]
      }
      anlass_gericht: {
        Row: {
          anlass_id: string
          portionen: number
          rezept_id: string
          vk_pro_portion: number
        }
        Insert: {
          anlass_id: string
          portionen: number
          rezept_id: string
          vk_pro_portion: number
        }
        Update: {
          anlass_id?: string
          portionen?: number
          rezept_id?: string
          vk_pro_portion?: number
        }
        Relationships: [
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_gericht_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      anlass_kosten: {
        Row: {
          anlass_id: string
          art: Database["public"]["Enums"]["kostenart"]
          bezeichnung: string | null
          id: string
          ist_chf: number | null
          plan_chf: number | null
        }
        Insert: {
          anlass_id: string
          art: Database["public"]["Enums"]["kostenart"]
          bezeichnung?: string | null
          id?: string
          ist_chf?: number | null
          plan_chf?: number | null
        }
        Update: {
          anlass_id?: string
          art?: Database["public"]["Enums"]["kostenart"]
          bezeichnung?: string | null
          id?: string
          ist_chf?: number | null
          plan_chf?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_kosten_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      anlass_personal: {
        Row: {
          anlass_id: string
          anzahl_eigen: number
          anzahl_freelancer: number
          bemerkung: string | null
          einsatz: string | null
          id: string
          reihenfolge: number
          rolle: string
          stunden_pro_person: number
        }
        Insert: {
          anlass_id: string
          anzahl_eigen?: number
          anzahl_freelancer?: number
          bemerkung?: string | null
          einsatz?: string | null
          id?: string
          reihenfolge?: number
          rolle: string
          stunden_pro_person: number
        }
        Update: {
          anlass_id?: string
          anzahl_eigen?: number
          anzahl_freelancer?: number
          bemerkung?: string | null
          einsatz?: string | null
          id?: string
          reihenfolge?: number
          rolle?: string
          stunden_pro_person?: number
        }
        Relationships: [
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      app_admin: {
        Row: {
          bemerkung: string | null
          erstellt_am: string
          user_id: string
        }
        Insert: {
          bemerkung?: string | null
          erstellt_am?: string
          user_id: string
        }
        Update: {
          bemerkung?: string | null
          erstellt_am?: string
          user_id?: string
        }
        Relationships: []
      }
      artikel: {
        Row: {
          aktiv: boolean
          artikelnummer: string | null
          einheit: string | null
          gebinde_g: number | null
          id: string
          lieferant_id: string | null
          name: string
          preis_chf: number | null
          preis_pro_einheit: number | null
          preisquelle: string | null
          stueck_g: number | null
          verlust_pct: number | null
        }
        Insert: {
          aktiv?: boolean
          artikelnummer?: string | null
          einheit?: string | null
          gebinde_g?: number | null
          id?: string
          lieferant_id?: string | null
          name: string
          preis_chf?: number | null
          preis_pro_einheit?: number | null
          preisquelle?: string | null
          stueck_g?: number | null
          verlust_pct?: number | null
        }
        Update: {
          aktiv?: boolean
          artikelnummer?: string | null
          einheit?: string | null
          gebinde_g?: number | null
          id?: string
          lieferant_id?: string | null
          name?: string
          preis_chf?: number | null
          preis_pro_einheit?: number | null
          preisquelle?: string | null
          stueck_g?: number | null
          verlust_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "artikel_lieferant_id_fkey"
            columns: ["lieferant_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["lieferant_id"]
          },
          {
            foreignKeyName: "artikel_lieferant_id_fkey"
            columns: ["lieferant_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["lieferant_id"]
          },
          {
            foreignKeyName: "artikel_lieferant_id_fkey"
            columns: ["lieferant_id"]
            isOneToOne: false
            referencedRelation: "lieferant"
            referencedColumns: ["id"]
          },
        ]
      }
      artikel_allergen: {
        Row: {
          allergen: string
          artikel_id: string
        }
        Insert: {
          allergen: string
          artikel_id: string
        }
        Update: {
          allergen?: string
          artikel_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "artikel_allergen_allergen_fkey"
            columns: ["allergen"]
            isOneToOne: false
            referencedRelation: "allergen"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "artikel_allergen_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artikel_allergen_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "artikel_allergen_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
        ]
      }
      artikel_preis: {
        Row: {
          artikel_id: string
          gueltig_ab: string
          preis_pro_einheit: number
          quelle: string | null
        }
        Insert: {
          artikel_id: string
          gueltig_ab: string
          preis_pro_einheit: number
          quelle?: string | null
        }
        Update: {
          artikel_id?: string
          gueltig_ab?: string
          preis_pro_einheit?: number
          quelle?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "artikel_preis_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "artikel_preis_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "artikel_preis_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
        ]
      }
      betrieb: {
        Row: {
          code: string
          faktor_vk: number
          name: string
          quelle: string | null
        }
        Insert: {
          code: string
          faktor_vk: number
          name: string
          quelle?: string | null
        }
        Update: {
          code?: string
          faktor_vk?: number
          name?: string
          quelle?: string | null
        }
        Relationships: []
      }
      einstellung: {
        Row: {
          bemerkung: string | null
          schluessel: string
          text_wert: string | null
          wert: number | null
        }
        Insert: {
          bemerkung?: string | null
          schluessel: string
          text_wert?: string | null
          wert?: number | null
        }
        Update: {
          bemerkung?: string | null
          schluessel?: string
          text_wert?: string | null
          wert?: number | null
        }
        Relationships: []
      }
      energiepreis: {
        Row: {
          chf_pro_kwh: number
          gueltig_ab: string
        }
        Insert: {
          chf_pro_kwh: number
          gueltig_ab: string
        }
        Update: {
          chf_pro_kwh?: number
          gueltig_ab?: string
        }
        Relationships: []
      }
      fixkosten: {
        Row: {
          bezeichnung: string
          chf_pro_monat: number
          gueltig_ab: string
          gueltig_bis: string | null
          id: string
          kategorie: Database["public"]["Enums"]["fixkosten_kategorie"]
        }
        Insert: {
          bezeichnung: string
          chf_pro_monat: number
          gueltig_ab: string
          gueltig_bis?: string | null
          id?: string
          kategorie: Database["public"]["Enums"]["fixkosten_kategorie"]
        }
        Update: {
          bezeichnung?: string
          chf_pro_monat?: number
          gueltig_ab?: string
          gueltig_bis?: string | null
          id?: string
          kategorie?: Database["public"]["Enums"]["fixkosten_kategorie"]
        }
        Relationships: []
      }
      geraet: {
        Row: {
          anzahl_eigen: number
          id: string
          kapazitaet: string | null
          leistung_kw: number | null
          mietbar: boolean
          mietpreis_chf_tag: number | null
          name: string
        }
        Insert: {
          anzahl_eigen?: number
          id?: string
          kapazitaet?: string | null
          leistung_kw?: number | null
          mietbar?: boolean
          mietpreis_chf_tag?: number | null
          name: string
        }
        Update: {
          anzahl_eigen?: number
          id?: string
          kapazitaet?: string | null
          leistung_kw?: number | null
          mietbar?: boolean
          mietpreis_chf_tag?: number | null
          name?: string
        }
        Relationships: []
      }
      gericht_katalog: {
        Row: {
          code: string | null
          gang: string | null
          id: string
          kategorie: string
          kollektion_id: string
          mengentyp: string | null
          name: string
          quelle_zeile: number | null
          rezept_id: string | null
        }
        Insert: {
          code?: string | null
          gang?: string | null
          id?: string
          kategorie: string
          kollektion_id: string
          mengentyp?: string | null
          name: string
          quelle_zeile?: number | null
          rezept_id?: string | null
        }
        Update: {
          code?: string | null
          gang?: string | null
          id?: string
          kategorie?: string
          kollektion_id?: string
          mengentyp?: string | null
          name?: string
          quelle_zeile?: number | null
          rezept_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gericht_katalog_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "gericht_katalog_kollektion_id_fkey"
            columns: ["kollektion_id"]
            isOneToOne: false
            referencedRelation: "kollektion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gericht_katalog_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      gericht_komponente: {
        Row: {
          bezeichnung: string
          gericht_id: string
          komponente_id: string | null
          menge_pro_portion: number | null
          reihenfolge: number
          verweis_kategorie: string | null
        }
        Insert: {
          bezeichnung: string
          gericht_id: string
          komponente_id?: string | null
          menge_pro_portion?: number | null
          reihenfolge: number
          verweis_kategorie?: string | null
        }
        Update: {
          bezeichnung?: string
          gericht_id?: string
          komponente_id?: string | null
          menge_pro_portion?: number | null
          reihenfolge?: number
          verweis_kategorie?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gericht_komponente_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gericht_komponente_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_warenkosten"
            referencedColumns: ["gericht_id"]
          },
          {
            foreignKeyName: "gericht_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gericht_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "gericht_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gericht_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "gericht_komponente_verweis_kategorie_fkey"
            columns: ["verweis_kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
        ]
      }
      import_lauf: {
        Row: {
          am: string
          anzahl: number | null
          bereich: string
          id: string
          quelle: string
        }
        Insert: {
          am?: string
          anzahl?: number | null
          bereich: string
          id?: string
          quelle: string
        }
        Update: {
          am?: string
          anzahl?: number | null
          bereich?: string
          id?: string
          quelle?: string
        }
        Relationships: []
      }
      karte: {
        Row: {
          anlass_id: string | null
          id: string
          name: string
        }
        Insert: {
          anlass_id?: string | null
          id?: string
          name: string
        }
        Update: {
          anlass_id?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      karte_position: {
        Row: {
          id: string
          karte_id: string
          menge: string | null
          name: string
          preis_chf: number | null
          reihenfolge: number
          rubrik: string | null
        }
        Insert: {
          id?: string
          karte_id: string
          menge?: string | null
          name: string
          preis_chf?: number | null
          reihenfolge: number
          rubrik?: string | null
        }
        Update: {
          id?: string
          karte_id?: string
          menge?: string | null
          name?: string
          preis_chf?: number | null
          reihenfolge?: number
          rubrik?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "karte_position_karte_id_fkey"
            columns: ["karte_id"]
            isOneToOne: false
            referencedRelation: "karte"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_position_karte_id_fkey"
            columns: ["karte_id"]
            isOneToOne: false
            referencedRelation: "karte_uebersicht"
            referencedColumns: ["id"]
          },
        ]
      }
      kategorie: {
        Row: {
          code: string
          reihenfolge: number
          wk_chf_pro_kg_schaetzung: number | null
        }
        Insert: {
          code: string
          reihenfolge: number
          wk_chf_pro_kg_schaetzung?: number | null
        }
        Update: {
          code?: string
          reihenfolge?: number
          wk_chf_pro_kg_schaetzung?: number | null
        }
        Relationships: []
      }
      kollektion: {
        Row: {
          id: string
          name: string
          stand: string | null
        }
        Insert: {
          id?: string
          name: string
          stand?: string | null
        }
        Update: {
          id?: string
          name?: string
          stand?: string | null
        }
        Relationships: []
      }
      komponente: {
        Row: {
          bemerkung: string | null
          cf_stufe: number | null
          hauptartikel_id: string | null
          id: string
          kategorie: string
          kollektion_id: string
          lager_0_2: boolean
          lager_gedeckt: boolean
          lager_tage: number | null
          lager_tk: boolean
          name: string
          produktion: string[]
          quelle_zeile: number
          regeneration: string[]
          rezept_id: string | null
        }
        Insert: {
          bemerkung?: string | null
          cf_stufe?: number | null
          hauptartikel_id?: string | null
          id?: string
          kategorie: string
          kollektion_id: string
          lager_0_2?: boolean
          lager_gedeckt?: boolean
          lager_tage?: number | null
          lager_tk?: boolean
          name: string
          produktion?: string[]
          quelle_zeile: number
          regeneration?: string[]
          rezept_id?: string | null
        }
        Update: {
          bemerkung?: string | null
          cf_stufe?: number | null
          hauptartikel_id?: string | null
          id?: string
          kategorie?: string
          kollektion_id?: string
          lager_0_2?: boolean
          lager_gedeckt?: boolean
          lager_tage?: number | null
          lager_tk?: boolean
          name?: string
          produktion?: string[]
          quelle_zeile?: number
          regeneration?: string[]
          rezept_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "komponente_kollektion_id_fkey"
            columns: ["kollektion_id"]
            isOneToOne: false
            referencedRelation: "kollektion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponente_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      lieferant: {
        Row: {
          aktiv: boolean
          bemerkung: string | null
          bestellschluss_stunde: number
          email: string | null
          id: string
          liefertage: number[]
          name: string
          telefon: string | null
          vorlauf_tage: number
        }
        Insert: {
          aktiv?: boolean
          bemerkung?: string | null
          bestellschluss_stunde?: number
          email?: string | null
          id?: string
          liefertage?: number[]
          name: string
          telefon?: string | null
          vorlauf_tage?: number
        }
        Update: {
          aktiv?: boolean
          bemerkung?: string | null
          bestellschluss_stunde?: number
          email?: string | null
          id?: string
          liefertage?: number[]
          name?: string
          telefon?: string | null
          vorlauf_tage?: number
        }
        Relationships: []
      }
      lohnsatz: {
        Row: {
          chf_pro_h: number
          chf_pro_h_freelancer: number | null
          gueltig_ab: string
          quelle: string | null
          rolle: string
        }
        Insert: {
          chf_pro_h: number
          chf_pro_h_freelancer?: number | null
          gueltig_ab: string
          quelle?: string | null
          rolle: string
        }
        Update: {
          chf_pro_h?: number
          chf_pro_h_freelancer?: number | null
          gueltig_ab?: string
          quelle?: string | null
          rolle?: string
        }
        Relationships: []
      }
      mengentyp: {
        Row: {
          code: string
          einheit: string
          reihenfolge: number
        }
        Insert: {
          code: string
          einheit?: string
          reihenfolge: number
        }
        Update: {
          code?: string
          einheit?: string
          reihenfolge?: number
        }
        Relationships: []
      }
      menuelinie: {
        Row: {
          anlass_id: string
          id: string
          name: string
          reihenfolge: number
        }
        Insert: {
          anlass_id: string
          id?: string
          name: string
          reihenfolge: number
        }
        Update: {
          anlass_id?: string
          id?: string
          name?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      menuelinie_gericht: {
        Row: {
          anteil: number
          bezeichnung: string
          gang: string
          gericht_id: string | null
          id: string
          menuelinie_id: string
          reihenfolge: number
        }
        Insert: {
          anteil?: number
          bezeichnung: string
          gang: string
          gericht_id?: string | null
          id?: string
          menuelinie_id: string
          reihenfolge: number
        }
        Update: {
          anteil?: number
          bezeichnung?: string
          gang?: string
          gericht_id?: string | null
          id?: string
          menuelinie_id?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "menuelinie_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_warenkosten"
            referencedColumns: ["gericht_id"]
          },
          {
            foreignKeyName: "menuelinie_gericht_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "anlass_komponente_bedarf"
            referencedColumns: ["menuelinie_id"]
          },
          {
            foreignKeyName: "menuelinie_gericht_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "menuelinie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_gericht_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "menuelinie_gaeste"
            referencedColumns: ["menuelinie_id"]
          },
        ]
      }
      menuelinie_komponente: {
        Row: {
          bezeichnung: string
          einheit: string
          id: string
          komponente_id: string | null
          linie_gericht_id: string
          menge_pro_gast: number | null
          reihenfolge: number
        }
        Insert: {
          bezeichnung: string
          einheit: string
          id?: string
          komponente_id?: string | null
          linie_gericht_id: string
          menge_pro_gast?: number | null
          reihenfolge: number
        }
        Update: {
          bezeichnung?: string
          einheit?: string
          id?: string
          komponente_id?: string | null
          linie_gericht_id?: string
          menge_pro_gast?: number | null
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_linie_gericht_id_fkey"
            columns: ["linie_gericht_id"]
            isOneToOne: false
            referencedRelation: "menuelinie_gericht"
            referencedColumns: ["id"]
          },
        ]
      }
      offener_punkt: {
        Row: {
          erledigt: boolean
          id: string
          rezept_id: string
          text: string
        }
        Insert: {
          erledigt?: boolean
          id?: string
          rezept_id: string
          text: string
        }
        Update: {
          erledigt?: boolean
          id?: string
          rezept_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "offener_punkt_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      offerte_gericht: {
        Row: {
          anlass_id: string
          anteil: number | null
          gericht_id: string
          reihenfolge: number
        }
        Insert: {
          anlass_id: string
          anteil?: number | null
          gericht_id: string
          reihenfolge?: number
        }
        Update: {
          anlass_id?: string
          anteil?: number | null
          gericht_id?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_warenkosten"
            referencedColumns: ["gericht_id"]
          },
        ]
      }
      produktion_aufgabe: {
        Row: {
          erledigt_am: string | null
          erledigt_von: string | null
          geaendert_am: string
          geaendert_von: string | null
          komponente_id: string
          saison_id: string
          zustaendig: string | null
        }
        Insert: {
          erledigt_am?: string | null
          erledigt_von?: string | null
          geaendert_am?: string
          geaendert_von?: string | null
          komponente_id: string
          saison_id: string
          zustaendig?: string | null
        }
        Update: {
          erledigt_am?: string | null
          erledigt_von?: string | null
          geaendert_am?: string
          geaendert_von?: string | null
          komponente_id?: string
          saison_id?: string
          zustaendig?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produktion_aufgabe_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produktion_aufgabe_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
        ]
      }
      produktionssystem: {
        Row: {
          bemerkung: string | null
          code: string
          haltbarkeit_tage: number
          name: string
          reihenfolge: number
        }
        Insert: {
          bemerkung?: string | null
          code: string
          haltbarkeit_tage: number
          name: string
          reihenfolge: number
        }
        Update: {
          bemerkung?: string | null
          code?: string
          haltbarkeit_tage?: number
          name?: string
          reihenfolge?: number
        }
        Relationships: []
      }
      produktionswelle: {
        Row: {
          bemerkung: string | null
          datum: string | null
          id: string
          nummer: number
          saison_id: string
          spaetestens_am: string | null
        }
        Insert: {
          bemerkung?: string | null
          datum?: string | null
          id?: string
          nummer: number
          saison_id: string
          spaetestens_am?: string | null
        }
        Update: {
          bemerkung?: string | null
          datum?: string | null
          id?: string
          nummer?: number
          saison_id?: string
          spaetestens_am?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
        ]
      }
      pruefregel: {
        Row: {
          code: string
          farbe: string
          text: string
        }
        Insert: {
          code: string
          farbe: string
          text: string
        }
        Update: {
          code?: string
          farbe?: string
          text?: string
        }
        Relationships: []
      }
      quantum: {
        Row: {
          angebotsform: string
          menge_pro_gast: number
          mengentyp: string
        }
        Insert: {
          angebotsform: string
          menge_pro_gast: number
          mengentyp: string
        }
        Update: {
          angebotsform?: string
          menge_pro_gast?: number
          mengentyp?: string
        }
        Relationships: [
          {
            foreignKeyName: "quantum_angebotsform_fkey"
            columns: ["angebotsform"]
            isOneToOne: false
            referencedRelation: "angebotsform"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "quantum_mengentyp_fkey"
            columns: ["mengentyp"]
            isOneToOne: false
            referencedRelation: "mengentyp"
            referencedColumns: ["code"]
          },
        ]
      }
      regenerationsart: {
        Row: {
          code: string
          name: string
          reihenfolge: number
        }
        Insert: {
          code: string
          name: string
          reihenfolge: number
        }
        Update: {
          code?: string
          name?: string
          reihenfolge?: number
        }
        Relationships: []
      }
      rezept: {
        Row: {
          basis_portionen: number | null
          besonderes: string | null
          chargengroesse: string | null
          ergibt_annahme: boolean
          ergibt_g: number | null
          geaendert_am: string
          id: string
          kategorie: string | null
          name: string
          portion_g: number | null
          portionen_annahme: boolean
          quelle: string | null
          slug: string
          status: string
          typ: Database["public"]["Enums"]["rezept_typ"]
          untertitel: string | null
          version: number
        }
        Insert: {
          basis_portionen?: number | null
          besonderes?: string | null
          chargengroesse?: string | null
          ergibt_annahme?: boolean
          ergibt_g?: number | null
          geaendert_am?: string
          id?: string
          kategorie?: string | null
          name: string
          portion_g?: number | null
          portionen_annahme?: boolean
          quelle?: string | null
          slug: string
          status?: string
          typ: Database["public"]["Enums"]["rezept_typ"]
          untertitel?: string | null
          version?: number
        }
        Update: {
          basis_portionen?: number | null
          besonderes?: string | null
          chargengroesse?: string | null
          ergibt_annahme?: boolean
          ergibt_g?: number | null
          geaendert_am?: string
          id?: string
          kategorie?: string | null
          name?: string
          portion_g?: number | null
          portionen_annahme?: boolean
          quelle?: string | null
          slug?: string
          status?: string
          typ?: Database["public"]["Enums"]["rezept_typ"]
          untertitel?: string | null
          version?: number
        }
        Relationships: []
      }
      rezept_komponente: {
        Row: {
          gericht_id: string
          komponente_id: string
          menge_pro_portion_g: number | null
          reihenfolge: number
        }
        Insert: {
          gericht_id: string
          komponente_id: string
          menge_pro_portion_g?: number | null
          reihenfolge?: number
        }
        Update: {
          gericht_id?: string
          komponente_id?: string
          menge_pro_portion_g?: number | null
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "rezept_komponente_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rezept_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      saison: {
        Row: {
          id: string
          kollektion_id: string | null
          name: string
          produktion_ab: string | null
          produktionsstandort: string
        }
        Insert: {
          id?: string
          kollektion_id?: string | null
          name: string
          produktion_ab?: string | null
          produktionsstandort?: string
        }
        Update: {
          id?: string
          kollektion_id?: string | null
          name?: string
          produktion_ab?: string | null
          produktionsstandort?: string
        }
        Relationships: [
          {
            foreignKeyName: "saison_kollektion_id_fkey"
            columns: ["kollektion_id"]
            isOneToOne: false
            referencedRelation: "kollektion"
            referencedColumns: ["id"]
          },
        ]
      }
      schritt: {
        Row: {
          aktiv_min: number | null
          annahme: boolean
          geraet_id: string | null
          gruppe_id: string
          haccp: string | null
          id: string
          ort: string | null
          reihenfolge: number
          rolle: string | null
          temperatur_c: number | null
          text: string
          unbeaufsichtigt_min: number | null
        }
        Insert: {
          aktiv_min?: number | null
          annahme?: boolean
          geraet_id?: string | null
          gruppe_id: string
          haccp?: string | null
          id?: string
          ort?: string | null
          reihenfolge: number
          rolle?: string | null
          temperatur_c?: number | null
          text: string
          unbeaufsichtigt_min?: number | null
        }
        Update: {
          aktiv_min?: number | null
          annahme?: boolean
          geraet_id?: string | null
          gruppe_id?: string
          haccp?: string | null
          id?: string
          ort?: string | null
          reihenfolge?: number
          rolle?: string | null
          temperatur_c?: number | null
          text?: string
          unbeaufsichtigt_min?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "schritt_geraet_id_fkey"
            columns: ["geraet_id"]
            isOneToOne: false
            referencedRelation: "geraet"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schritt_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "zutatengruppe"
            referencedColumns: ["id"]
          },
        ]
      }
      service: {
        Row: {
          anlass_id: string
          datum: string | null
          gaeste: number
          id: string
          menuelinie_id: string | null
          name: string
          reihenfolge: number
        }
        Insert: {
          anlass_id: string
          datum?: string | null
          gaeste: number
          id?: string
          menuelinie_id?: string | null
          name: string
          reihenfolge: number
        }
        Update: {
          anlass_id?: string
          datum?: string | null
          gaeste?: number
          id?: string
          menuelinie_id?: string | null
          name?: string
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "service_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "anlass_komponente_bedarf"
            referencedColumns: ["menuelinie_id"]
          },
          {
            foreignKeyName: "service_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "menuelinie"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_menuelinie_id_fkey"
            columns: ["menuelinie_id"]
            isOneToOne: false
            referencedRelation: "menuelinie_gaeste"
            referencedColumns: ["menuelinie_id"]
          },
        ]
      }
      welle_komponente: {
        Row: {
          einheit: string
          komponente_id: string
          menge: number | null
          vorschlag_nr: number | null
          welle_id: string
        }
        Insert: {
          einheit: string
          komponente_id: string
          menge?: number | null
          vorschlag_nr?: number | null
          welle_id: string
        }
        Update: {
          einheit?: string
          komponente_id?: string
          menge?: number | null
          vorschlag_nr?: number | null
          welle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "welle_komponente_welle_id_fkey"
            columns: ["welle_id"]
            isOneToOne: false
            referencedRelation: "produktionswelle"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welle_komponente_welle_id_fkey"
            columns: ["welle_id"]
            isOneToOne: false
            referencedRelation: "wellenplan"
            referencedColumns: ["welle_id"]
          },
        ]
      }
      zutat: {
        Row: {
          annahme: boolean
          artikel_id: string | null
          bezeichnung: string
          gruppe_id: string
          id: string
          ist_basis: boolean
          komponente_id: string | null
          menge_g: number | null
          notiz: string | null
          reihenfolge: number
        }
        Insert: {
          annahme?: boolean
          artikel_id?: string | null
          bezeichnung: string
          gruppe_id: string
          id?: string
          ist_basis?: boolean
          komponente_id?: string | null
          menge_g?: number | null
          notiz?: string | null
          reihenfolge: number
        }
        Update: {
          annahme?: boolean
          artikel_id?: string | null
          bezeichnung?: string
          gruppe_id?: string
          id?: string
          ist_basis?: boolean
          komponente_id?: string | null
          menge_g?: number | null
          notiz?: string | null
          reihenfolge?: number
        }
        Relationships: [
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "zutat_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "zutatengruppe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zutat_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      zutatengruppe: {
        Row: {
          id: string
          reihenfolge: number
          rezept_id: string
          titel: string | null
        }
        Insert: {
          id?: string
          reihenfolge: number
          rezept_id: string
          titel?: string | null
        }
        Update: {
          id?: string
          reihenfolge?: number
          rezept_id?: string
          titel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zutatengruppe_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      anlass_deckungsbeitrag: {
        Row: {
          datum: string | null
          db_chf: number | null
          db_pct: number | null
          gaeste: number | null
          id: string | null
          name: string | null
          nummer: string | null
          personal_chf: number | null
          uebrige_chf: number | null
          umsatz_chf: number | null
          waren_chf: number | null
        }
        Relationships: []
      }
      anlass_geraet_bedarf: {
        Row: {
          anlass_id: string | null
          anzahl: number | null
          anzahl_eigen: number | null
          bemerkung: string | null
          eigen_anzahl: number | null
          eigen_frei: number | null
          frueher_belegt: number | null
          geraet: string | null
          geraet_id: string | null
          herleitung: string | null
          id: string | null
          mietbar: boolean | null
          miete_anzahl: number | null
          mietkosten_chf: number | null
          mietpreis_chf_tag: number | null
          tage: number | null
          zusatzbedarf: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_geraet_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_geraet_geraet_id_fkey"
            columns: ["geraet_id"]
            isOneToOne: false
            referencedRelation: "geraet"
            referencedColumns: ["id"]
          },
        ]
      }
      anlass_kalkulation: {
        Row: {
          anlass_id: string | null
          annahme: boolean | null
          datum: string | null
          datum_bis: string | null
          db_chf: number | null
          db_pct: number | null
          db_ziel_pct: number | null
          ergebnis_chf: number | null
          ergebnis_pct: number | null
          fehlend: string | null
          fix_anteil_chf: number | null
          fix_zuschlag_pct: number | null
          gaeste: number | null
          geraete_anzahl: number | null
          geraete_miete: number | null
          herleitung: string | null
          kunde: string | null
          monat: string | null
          name: string | null
          nummer: string | null
          personal_anzahl: number | null
          personal_chf: number | null
          personal_freelancer: number | null
          personal_stunden: number | null
          status: string | null
          uebrige_chf: number | null
          umsatz_chf: number | null
          umsatz_quelle: string | null
          variabel_chf: number | null
          waren_chf: number | null
          zaehlt: boolean | null
        }
        Relationships: []
      }
      anlass_komponente_bedarf: {
        Row: {
          anlass_id: string | null
          anteil: number | null
          einheit: string | null
          einheit_total: string | null
          gaeste: number | null
          gang: string | null
          gericht: string | null
          komponente: string | null
          komponente_id: string | null
          menge_pro_gast: number | null
          menge_total: number | null
          menuelinie: string | null
          menuelinie_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
        ]
      }
      anlass_kostenart: {
        Row: {
          anlass_id: string | null
          annahme: boolean | null
          art: Database["public"]["Enums"]["kostenart"] | null
          berechnet_chf: number | null
          gilt_chf: number | null
          hand_plan_chf: number | null
          herleitung: string | null
          ist_chf: number | null
          ist_erfasst: boolean | null
          ordnung: number | null
          plan_chf: number | null
          unvollstaendig: boolean | null
        }
        Relationships: []
      }
      anlass_personal_kosten: {
        Row: {
          anlass_id: string | null
          anzahl: number | null
          anzahl_eigen: number | null
          anzahl_freelancer: number | null
          bemerkung: string | null
          chf_pro_h: number | null
          chf_pro_h_freelancer: number | null
          einsatz: string | null
          freelancer_satz_annahme: boolean | null
          herleitung: string | null
          id: string | null
          kosten_chf: number | null
          reihenfolge: number | null
          rolle: string | null
          stunden: number | null
          stunden_pro_person: number | null
          zusatzbedarf: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_personal_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      anlass_uebersicht: {
        Row: {
          datum: string | null
          datum_bis: string | null
          gaeste_services: number | null
          id: string | null
          karten: number | null
          kunde: string | null
          menuelinien: number | null
          name: string | null
          nummer: string | null
          ort: string | null
          saison: string | null
          saison_id: string | null
          services: number | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
        ]
      }
      einkauf_artikel: {
        Row: {
          artikel: string | null
          artikel_einheit: string | null
          artikel_id: string | null
          artikelnummer: string | null
          bedarf_am: string | null
          bestellen_bis: string | null
          bezug: string | null
          bezug_typ: string | null
          herleitung: string | null
          komponenten: number | null
          komponenten_namen: string | null
          kosten_chf: number | null
          lieferant: string | null
          lieferant_id: string | null
          liefern_bis: string | null
          liefertermin: string | null
          menge_artikel: number | null
          preis_pro_einheit: number | null
          quelle: string | null
          saison_id: string | null
          sortierung: number | null
        }
        Relationships: []
      }
      einkauf_position: {
        Row: {
          artikel: string | null
          artikel_einheit: string | null
          artikel_id: string | null
          artikelnummer: string | null
          bedarf_am: string | null
          bestellen_bis: string | null
          bezug: string | null
          bezug_typ: string | null
          einheit: string | null
          herleitung: string | null
          kategorie: string | null
          komponente: string | null
          komponente_id: string | null
          kosten_chf: number | null
          lieferant: string | null
          lieferant_id: string | null
          liefern_bis: string | null
          liefertermin: string | null
          menge_artikel: number | null
          menge_komponente: number | null
          nur_vor_ort: boolean | null
          preis_pro_einheit: number | null
          quelle: string | null
          saison_id: string | null
          sortierung: number | null
          status: string | null
          typ: string | null
          verlust_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
        ]
      }
      einkauf_summe: {
        Row: {
          aus_vorschlag: boolean | null
          bestellschluesse_vorbei: number | null
          kosten_chf: number | null
          naechster_bestellschluss: string | null
          positionen_artikel: number | null
          positionen_artikel_ohne_kosten: number | null
          positionen_nicht_im_plan: number | null
          positionen_offen: number | null
          positionen_zukauf: number | null
          saison: string | null
          saison_id: string | null
        }
        Relationships: []
      }
      gericht_warenkosten: {
        Row: {
          gericht_id: string | null
          komponenten_ohne_preis: number | null
          name: string | null
          wk_inkl_zuschlag_chf: number | null
          wk_rohware_chf: number | null
        }
        Relationships: []
      }
      karte_uebersicht: {
        Row: {
          anlass: string | null
          anlass_id: string | null
          id: string | null
          name: string | null
          positionen: number | null
          positionen_ohne_preis: number | null
        }
        Relationships: [
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "karte_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      komponente_pruefhinweis: {
        Row: {
          code: string | null
          farbe: string | null
          kategorie: string | null
          komponente_id: string | null
          name: string | null
          text: string | null
        }
        Relationships: [
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
        ]
      }
      komponente_zuteilung: {
        Row: {
          bemerkung: string | null
          cf_stufe: number | null
          haltbarkeit_tage: number | null
          hauptartikel_id: string | null
          id: string | null
          kategorie: string | null
          kollektion_id: string | null
          lager_0_2: boolean | null
          lager_gedeckt: boolean | null
          lager_tage: number | null
          lager_tk: boolean | null
          name: string | null
          nur_vor_ort: boolean | null
          produktion: string[] | null
          quelle_zeile: number | null
          regeneration: string[] | null
          rezept_id: string | null
          status: string | null
        }
        Insert: {
          bemerkung?: string | null
          cf_stufe?: number | null
          haltbarkeit_tage?: never
          hauptartikel_id?: string | null
          id?: string | null
          kategorie?: string | null
          kollektion_id?: string | null
          lager_0_2?: boolean | null
          lager_gedeckt?: boolean | null
          lager_tage?: number | null
          lager_tk?: boolean | null
          name?: string | null
          nur_vor_ort?: never
          produktion?: string[] | null
          quelle_zeile?: number | null
          regeneration?: string[] | null
          rezept_id?: string | null
          status?: never
        }
        Update: {
          bemerkung?: string | null
          cf_stufe?: number | null
          haltbarkeit_tage?: never
          hauptartikel_id?: string | null
          id?: string | null
          kategorie?: string | null
          kollektion_id?: string | null
          lager_0_2?: boolean | null
          lager_gedeckt?: boolean | null
          lager_tage?: number | null
          lager_tk?: boolean | null
          name?: string | null
          nur_vor_ort?: never
          produktion?: string[] | null
          quelle_zeile?: number | null
          regeneration?: string[] | null
          rezept_id?: string | null
          status?: never
        }
        Relationships: [
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "komponente_hauptartikel_id_fkey"
            columns: ["hauptartikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "komponente_kollektion_id_fkey"
            columns: ["kollektion_id"]
            isOneToOne: false
            referencedRelation: "kollektion"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "komponente_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      menuelinie_gaeste: {
        Row: {
          anlass_id: string | null
          gaeste: number | null
          herleitung: string | null
          menuelinie_id: string | null
          name: string | null
          services: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      monat_ergebnis: {
        Row: {
          anlaesse: number | null
          anlaesse_ohne_umsatz: number | null
          anlaesse_unvollstaendig: number | null
          annahme: boolean | null
          breakeven_umsatz_chf: number | null
          db_chf: number | null
          db_pct: number | null
          ergebnis_chf: number | null
          fix_chf: number | null
          fixkosten_zeilen: number | null
          gaeste: number | null
          herleitung: string | null
          monat: string | null
          rentabel: boolean | null
          umsatz_bekannt_chf: number | null
          umsatz_chf: number | null
        }
        Relationships: []
      }
      offerte_position: {
        Row: {
          anlass_id: string | null
          anteil: number | null
          anteil_pruefen: boolean | null
          anteil_summe_typ: number | null
          anteil_wirksam: number | null
          bezeichnung: string | null
          code: string | null
          einheit: string | null
          faktor_vk: number | null
          gang: string | null
          gericht_id: string | null
          gerichte_gleicher_typ: number | null
          herleitung: string | null
          kategorie: string | null
          menge_pro_gast: number | null
          mengentyp: string | null
          name: string | null
          quantum: number | null
          reihenfolge: number | null
          vk_pro_gast_chf: number | null
          wk_annahme: boolean | null
          wk_pro_gast_chf: number | null
          wk_quelle: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gericht_katalog_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "offerte_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_katalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offerte_gericht_gericht_id_fkey"
            columns: ["gericht_id"]
            isOneToOne: false
            referencedRelation: "gericht_warenkosten"
            referencedColumns: ["gericht_id"]
          },
        ]
      }
      offerte_summe: {
        Row: {
          anlass_id: string | null
          deckungsbeitrag_chf: number | null
          deckungsbeitrag_pct: number | null
          gaeste: number | null
          herleitung: string | null
          mengentypen_anteil_pruefen: number | null
          mwst_chf: number | null
          mwst_satz: number | null
          positionen: number | null
          positionen_geschaetzt: number | null
          positionen_ohne_preis: number | null
          preis_pro_gast_chf: number | null
          rundung: number | null
          total_brutto_chf: number | null
          umsatz_netto_chf: number | null
          vk_pro_gast_chf: number | null
          warenkosten_chf: number | null
          wk_pro_gast_chf: number | null
        }
        Relationships: []
      }
      produktionsliste: {
        Row: {
          einheit_total: string | null
          haltbarkeit_tage: number | null
          kategorie: string | null
          komponente: string | null
          komponente_id: string | null
          menge_total: number | null
          saison_id: string | null
          start_ab: string | null
          status: string | null
          wellen: number | null
          zeilen_ohne_menge: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
        ]
      }
      rezept_kosten_arbeit_energie: {
        Row: {
          arbeit_chf: number | null
          energie_chf: number | null
          rezept_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "zutatengruppe_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      rezept_kosten_waren: {
        Row: {
          rezept_id: string | null
          waren_chf: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zutatengruppe_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      rezept_zeit: {
        Row: {
          aktiv_min: number | null
          rezept_id: string | null
          unbeaufsichtigt_min: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zutatengruppe_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
      service_komponente_bedarf: {
        Row: {
          anlass_id: string | null
          anlieferung: string | null
          datum: string | null
          einheit_total: string | null
          komponente_id: string | null
          menge: number | null
          reihenfolge: number | null
          saison_id: string | null
          service: string | null
          service_id: string | null
          zeilen_ohne_menge: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_deckungsbeitrag"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kalkulation"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_kostenart"
            referencedColumns: ["anlass_id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "anlass_uebersicht"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "service_anlass_id_fkey"
            columns: ["anlass_id"]
            isOneToOne: false
            referencedRelation: "offerte_summe"
            referencedColumns: ["anlass_id"]
          },
        ]
      }
      wellen_aktuell: {
        Row: {
          bezug: string | null
          datum: string | null
          einheit: string | null
          komponente_id: string | null
          menge: number | null
          nr: number | null
          quelle: string | null
          saison_id: string | null
        }
        Relationships: []
      }
      wellen_uebersicht: {
        Row: {
          hinweise_gelb: number | null
          hinweise_rot: number | null
          komponenten_mit_welle: number | null
          komponenten_offen: number | null
          komponenten_vor_ort: number | null
          komponenten_zukauf: number | null
          plan_wellen: number | null
          saison: string | null
          saison_id: string | null
          services: number | null
          services_ohne_datum: number | null
          vorschlag_wellen: number | null
        }
        Insert: {
          hinweise_gelb?: never
          hinweise_rot?: never
          komponenten_mit_welle?: never
          komponenten_offen?: never
          komponenten_vor_ort?: never
          komponenten_zukauf?: never
          plan_wellen?: never
          saison?: string | null
          saison_id?: string | null
          services?: never
          services_ohne_datum?: never
          vorschlag_wellen?: never
        }
        Update: {
          hinweise_gelb?: never
          hinweise_rot?: never
          komponenten_mit_welle?: never
          komponenten_offen?: never
          komponenten_vor_ort?: never
          komponenten_zukauf?: never
          plan_wellen?: never
          saison?: string | null
          saison_id?: string | null
          services?: never
          services_ohne_datum?: never
          vorschlag_wellen?: never
        }
        Relationships: []
      }
      wellen_vorschlag: {
        Row: {
          anlieferung_knapp: boolean | null
          einheit_total: string | null
          erste_anlieferung: string | null
          haltbar_bis: string | null
          haltbarkeit_tage: number | null
          herleitung: string | null
          kategorie: string | null
          komponente: string | null
          komponente_id: string | null
          letzter_service: string | null
          menge: number | null
          nr: number | null
          produktion_am: string | null
          saison_id: string | null
          services_ohne_datum: number | null
          services_ohne_welle: number | null
          status: string | null
          tage_ueber_haltbarkeit: number | null
        }
        Relationships: [
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anlass_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menuelinie_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
        ]
      }
      wellenplan: {
        Row: {
          bemerkung: string | null
          datum: string | null
          einheit: string | null
          haltbar_bis: string | null
          haltbarkeit_tage: number | null
          herleitung: string | null
          hinweis: string | null
          hinweis_farbe: string | null
          kategorie: string | null
          komponente: string | null
          komponente_id: string | null
          letzter_service: string | null
          menge: number | null
          menge_aktuell: number | null
          nummer: number | null
          saison_id: string | null
          spaetestens_am: string | null
          status: string | null
          welle_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "komponente_kategorie_fkey"
            columns: ["kategorie"]
            isOneToOne: false
            referencedRelation: "kategorie"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "einkauf_summe"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "saison"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produktionswelle_saison_id_fkey"
            columns: ["saison_id"]
            isOneToOne: false
            referencedRelation: "wellen_uebersicht"
            referencedColumns: ["saison_id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_pruefhinweis"
            referencedColumns: ["komponente_id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "komponente_zuteilung"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "welle_komponente_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "produktionsliste"
            referencedColumns: ["komponente_id"]
          },
        ]
      }
      zutat_skaliert: {
        Row: {
          annahme: boolean | null
          artikel_id: string | null
          bezeichnung: string | null
          gruppe_id: string | null
          id: string | null
          ist_basis: boolean | null
          komponente_id: string | null
          menge_g: number | null
          notiz: string | null
          reihenfolge: number | null
          rezept_id: string | null
          skal_pct: number | null
        }
        Relationships: [
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "artikel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_artikel"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "zutat_artikel_id_fkey"
            columns: ["artikel_id"]
            isOneToOne: false
            referencedRelation: "einkauf_position"
            referencedColumns: ["artikel_id"]
          },
          {
            foreignKeyName: "zutat_gruppe_id_fkey"
            columns: ["gruppe_id"]
            isOneToOne: false
            referencedRelation: "zutatengruppe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zutat_komponente_id_fkey"
            columns: ["komponente_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zutatengruppe_rezept_id_fkey"
            columns: ["rezept_id"]
            isOneToOne: false
            referencedRelation: "rezept"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      anlass_kosten_setzen: {
        Args: {
          p_anlass: string
          p_art: Database["public"]["Enums"]["kostenart"]
          p_ist: number
          p_plan: number
        }
        Returns: undefined
      }
      geraet_zuteilung: {
        Args: never
        Returns: {
          anlass_geraet_id: string
          eigen_anzahl: number
          frueher_belegt: number
        }[]
      }
      ist_admin: { Args: never; Returns: boolean }
      karte_kopieren: {
        Args: { p_anlass: string; p_karte: string; p_name?: string }
        Returns: string
      }
      lieferant_bestelltermin: {
        Args: { p_lieferant: string; p_liefern_bis: string }
        Returns: {
          bestellen_bis: string
          liefertermin: string
        }[]
      }
      menuelinie_gericht_hinzufuegen: {
        Args: { p_anteil?: number; p_gericht: string; p_linie: string }
        Returns: string
      }
      offerte_bestaetigen: {
        Args: { p_anlass: string; p_saison: string }
        Returns: string
      }
      rezept_faktor: {
        Args: { p_rezept: string; p_wert: number }
        Returns: {
          chargen: number
          ergibt_g: number
          faktor: number
          herleitung: string
          portionen: number
        }[]
      }
      rezept_komponenten_skaliert: {
        Args: { p_rezept: string; p_wert: number }
        Returns: {
          chargen: number
          ergibt_annahme: boolean
          ergibt_g: number
          herleitung: string
          komponente_id: string
          menge_g: number
          menge_pro_portion_g: number
          name: string
          reihenfolge: number
        }[]
      }
      rezept_loeschen: { Args: { p_rezept: string }; Returns: undefined }
      rezept_slug: { Args: { p_name: string }; Returns: string }
      rezept_speichern: {
        Args: { p_daten: Json; p_geaendert_am: string; p_rezept: string }
        Returns: Json
      }
      rezept_zutaten_skaliert: {
        Args: { p_rezept: string; p_wert: number }
        Returns: {
          annahme: boolean
          bezeichnung: string
          gruppe_id: string
          id: string
          ist_basis: boolean
          menge_basis_g: number
          menge_g: number
          notiz: string
          reihenfolge: number
          skal_pct: number
        }[]
      }
      wellen_anzahl: {
        Args: { p_haltbarkeit: number; p_saison: string }
        Returns: number
      }
      wellen_termine: {
        Args: { p_haltbarkeit: number; p_saison: string }
        Returns: {
          haltbar_bis: string
          nr: number
          produktion_am: string
        }[]
      }
      wellenplan_uebernehmen: { Args: { p_saison: string }; Returns: number }
    }
    Enums: {
      fixkosten_kategorie:
        | "loehne_fix"
        | "miete"
        | "abschreibung"
        | "energie_grundlast"
        | "fahrzeuge"
        | "versicherung"
        | "marketing"
        | "it_verwaltung"
        | "uebrige"
      kostenart:
        | "waren"
        | "personal"
        | "energie"
        | "geraetemiete"
        | "transport"
        | "material"
      rezept_typ: "gericht" | "komponente"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      fixkosten_kategorie: [
        "loehne_fix",
        "miete",
        "abschreibung",
        "energie_grundlast",
        "fahrzeuge",
        "versicherung",
        "marketing",
        "it_verwaltung",
        "uebrige",
      ],
      kostenart: [
        "waren",
        "personal",
        "energie",
        "geraetemiete",
        "transport",
        "material",
      ],
      rezept_typ: ["gericht", "komponente"],
    },
  },
} as const
